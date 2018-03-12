/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import * as util from './util';
// tslint:disable-next-line:max-line-length
import {DocClass, DocFunction, DocFunctionParam, DocHeading, Docs, RepoDocsAndMetadata} from './view';

const DOCUMENTATION_DECORATOR = '@doc';
const DOCUMENTATION_TYPE_ALIAS = 'docalias';
const DOCUMENTATION_LINK_ALIAS = 'doclink';

/**
 * Parses the program.
 */
export function parse(
    programRoot: string, srcRoot: string, repoPath: string,
    githubRoot: string): RepoDocsAndMetadata {
  if (!fs.existsSync(programRoot)) {
    throw new Error(
        `Program root ${programRoot} does not exist. Please run this script ` +
        `from the root of repository.`);
  }

  const docHeadings: DocHeading[] = [];

  // We keep an auxillary map of explicitly marked "subclass" fields on
  // @doc to the method entries
  const subclassMethodMap: {[subclass: string]: DocFunction[]} = {};
  const docTypeAliases: {[type: string]: string} = {};
  const docLinkAliases: {[symbolName: string]: string} = {};
  const globalSymbolDocMap:
      {[symbolName: string]: {docs: string, params: DocFunctionParam[]}} = {};
  const configInterfaceParamMap:
      {[interfaceName: string]: DocFunctionParam[]} = {};

  // Use the same compiler options that we use to compile the library
  // here.
  const tsconfig =
      JSON.parse(fs.readFileSync(path.join(repoPath, 'tsconfig.json'), 'utf8'));

  const program = ts.createProgram([programRoot], tsconfig.compilerOptions);
  const checker = program.getTypeChecker();

  // Visit all the nodes that are transitively linked from the source
  // root.
  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      ts.forEachChild(
          sourceFile,
          node => visitNode(
              docHeadings, subclassMethodMap, docTypeAliases, docLinkAliases,
              globalSymbolDocMap, configInterfaceParamMap, checker, node,
              sourceFile, srcRoot, repoPath, githubRoot));
    }
  }

  util.unpackConfigParams(docHeadings, configInterfaceParamMap);
  util.replaceUseDocsFromDocStrings(docHeadings, globalSymbolDocMap);
  util.addSubclassMethods(docHeadings, subclassMethodMap);
  util.replaceDocTypeAliases(docHeadings, docTypeAliases);

  const docs: Docs = {headings: docHeadings};

  return {docs, docLinkAliases};
}

// Visits nodes of the AST, finding documentation annotated with @doc.
function visitNode(
    docHeadings: DocHeading[],
    subclassMethodMap: {[subclass: string]: DocFunction[]},
    docTypeAliases: {[type: string]: string},
    docLinkAliases: {[symbolName: string]: string},
    globalSymbolDocMap:
        {[symbolName: string]: {docs: string, params: DocFunctionParam[]}},
    configInterfaceParamMap: {[interfaceName: string]: DocFunctionParam[]},
    checker: ts.TypeChecker, node: ts.Node, sourceFile: ts.SourceFile,
    srcRoot: string, repoPath: string, githubRoot: string) {
  if (ts.isMethodDeclaration(node)) {
    const symbol = checker.getSymbolAtLocation(node.name);
    const docInfo = util.getDocDecorator(node, DOCUMENTATION_DECORATOR);

    if (docInfo != null) {
      const subheading =
          util.fillHeadingsAndGetSubheading(docInfo, docHeadings);

      const docFunction = serializeMethod(
          checker, node, docInfo, sourceFile, repoPath, srcRoot, githubRoot);

      // Static methods are top-level functions,
      if (util.isStatic(node)) {
        subheading.symbols.push(docFunction);
      } else {
        // Non-static methods are class-specific.
        if (docInfo.subclasses != null) {
          for (let i = 0; i < docInfo.subclasses.length; i++) {
            const subclass = docInfo.subclasses[i];
            if (subclassMethodMap[subclass] == null) {
              subclassMethodMap[subclass] = [];
            }
            subclassMethodMap[subclass].push(docFunction);
          }
        }
      }
    }
  } else if (ts.isClassDeclaration(node)) {
    const docLinkAlias = util.getJsdoc(checker, node, DOCUMENTATION_LINK_ALIAS);
    if (docLinkAlias != null) {
      docLinkAliases[node.name.getText()] = docLinkAlias;
    }

    const docInfo = util.getDocDecorator(node, DOCUMENTATION_DECORATOR);
    if (docInfo != null) {
      const subheading =
          util.fillHeadingsAndGetSubheading(docInfo, docHeadings);

      subheading.symbols.push(serializeClass(
          checker, node, docInfo, sourceFile, docHeadings, repoPath, srcRoot,
          githubRoot));
    }

    // You can't use both doc link aliases and @doc decorators.
    if (docInfo != null && docLinkAlias != null) {
      throw new Error(
          `Class ${node.name.getText()} has both a ` +
          `doc link alias and a doc decorator.`);
    }
  }

  if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node) || ts.isClassDeclaration(node)) {
    const docAlias = util.getJsdoc(checker, node, DOCUMENTATION_TYPE_ALIAS);
    if (docAlias != null) {
      const symbol = checker.getSymbolAtLocation(node.name);
      docTypeAliases[symbol.getName()] = docAlias;
    }
  }

  // Map all symbols to their documentation so we can map useDocFrom aliases.
  if (ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node)) {
    const symbol = checker.getSymbolAtLocation(node.name);
    const type =
        checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!);
    const name = symbol.getName();
    const documentation =
        ts.displayPartsToString(symbol.getDocumentationComment(undefined));

    const signature = type.getCallSignatures()[0];

    let params = [];
    if (signature != null && signature.parameters != null) {
      const identifierGenericMap = ts.isMethodDeclaration(node) ?
          util.getIdentifierGenericMap(node, symbol.name) :
          {};

      const isConfigParam = false;
      params = signature.parameters != null ?
          signature.parameters.map(
              symbol => serializeParameter(
                  checker, symbol, identifierGenericMap, isConfigParam)) :
          [];
    }

    globalSymbolDocMap[name] = {docs: documentation, params};
  }

  // Map interfaces to their parameter list so we can unpack configuration
  // objects.
  if (ts.isInterfaceDeclaration(node)) {
    const symbol = checker.getSymbolAtLocation(node.name);
    const params = [];
    node.forEachChild(child => {
      if (ts.isPropertySignature(child)) {
        const childSymbol = checker.getSymbolAtLocation(child.name);
        // We don't support generics on interfaces yet, so pass an empty
        // generic map.
        const identifierGenericMap = {};
        const isConfigParam = true;
        params.push(serializeParameter(
            checker, childSymbol, identifierGenericMap, isConfigParam));
      }
    });
    configInterfaceParamMap[symbol.getName()] = params;
  }

  ts.forEachChild(
      node,
      node => visitNode(
          docHeadings, subclassMethodMap, docTypeAliases, docLinkAliases,
          globalSymbolDocMap, configInterfaceParamMap, checker, node,
          sourceFile, srcRoot, repoPath, githubRoot));
}

export function serializeClass(
    checker: ts.TypeChecker, node: ts.ClassDeclaration, docInfo: util.DocInfo,
    sourceFile: ts.SourceFile, docHeadings: DocHeading[], repoPath: string,
    srcRoot: string, githubRoot: string): DocClass {
  const symbol = checker.getSymbolAtLocation(node.name);
  const name = symbol.getName();

  const {displayFilename, githubUrl} =
      util.getFileInfo(node, sourceFile, repoPath, srcRoot, githubRoot);
  const docClass: DocClass = {
    docInfo: docInfo,
    symbolName: name,
    namespace: docInfo.namespace,
    documentation:
        ts.displayPartsToString(symbol.getDocumentationComment(undefined)),
    fileName: displayFilename,
    githubUrl,
    methods: [],
    isClass: true
  };

  // Parse the methods that are annotated with @doc.
  node.members.forEach(member => {
    if (ts.isMethodDeclaration(member) && !util.isStatic(member)) {
      const docInfo = util.getDocDecorator(member, DOCUMENTATION_DECORATOR);
      if (docInfo != null) {
        docClass.methods.push(serializeMethod(
            checker, member, docInfo, sourceFile, repoPath, srcRoot,
            githubRoot));
      }
    }
  });

  return docClass;
}

export function serializeMethod(
    checker: ts.TypeChecker, node: ts.MethodDeclaration, docInfo: util.DocInfo,
    sourceFile: ts.SourceFile, repoPath: string, srcRoot: string,
    githubRoot: string): DocFunction {
  if (!sourceFile.fileName.startsWith(repoPath)) {
    throw new Error(
        `Error: source file ${sourceFile.fileName} ` +
        `does not start with srcPath provided ${repoPath}.`);
  }

  const symbol = checker.getSymbolAtLocation(node.name);
  const type =
      checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!);
  const signature = type.getCallSignatures()[0];

  const identifierGenericMap = util.getIdentifierGenericMap(node, symbol.name);

  const isConfigParam = false;
  const parameters = signature.parameters.map(
      symbol => serializeParameter(
          checker, symbol, identifierGenericMap, isConfigParam));
  const paramStr = '(' +
      parameters.map(param => param.name + (param.optional ? '?' : ''))
          .join(', ') +
      ')';

  const {displayFilename, githubUrl} =
      util.getFileInfo(node, sourceFile, repoPath, srcRoot, githubRoot);

  // Find a type node in the method signature. This is a return type. If
  // it cannot be found (no return type), fall back to the standard way of
  // getting the type. We do this because getting the full text of the
  // type node is better than using the signature return type.
  let returnType;
  node.forEachChild(child => {
    if (ts.isTypeNode(child)) {
      returnType = child.getText();
    }
  });
  if (returnType == null) {
    // Fall back the the standard way of getting the type, which sometimes
    // gives up and returns 'any' or '{}' for complex types.
    returnType = checker.typeToString(signature.getReturnType());
  }
  returnType = util.sanitizeTypeString(returnType, identifierGenericMap);

  const method: DocFunction = {
    docInfo: docInfo,
    symbolName: symbol.name,
    namespace: docInfo.namespace,
    paramStr,
    parameters,
    returnType,
    documentation:
        ts.displayPartsToString(signature.getDocumentationComment(undefined)),
    fileName: displayFilename,
    githubUrl,
    isFunction: true
  };

  return method;
}

function serializeParameter(
    checker: ts.TypeChecker, symbol: ts.Symbol,
    identifierGenericMap: {[identifier: string]: string},
    isConfigParam: boolean): DocFunctionParam {
  return {
    name: symbol.getName(),
    documentation:
        ts.displayPartsToString(symbol.getDocumentationComment(undefined)),
    type: util.parameterTypeToString(checker, symbol, identifierGenericMap),
    optional: checker.isOptionalParameter(
        symbol.valueDeclaration as ts.ParameterDeclaration),
    isConfigParam
  };
}
