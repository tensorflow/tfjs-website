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
import {DocClass, DocExtraType, DocVariable, DocFunction, DocFunctionParam, DocHeading, Docs, RepoDocsAndMetadata} from './view';

const DOCUMENTATION_DECORATOR_AND_ANNOTATION = 'doc';
const DOCUMENTATION_TYPE_ALIAS = 'docalias';
const DOCUMENTATION_LINK_ALIAS = 'doclink';
const DOCUMENTATION_INLINE = 'docinline';

// Use this decorator to include extra type documents in the class comment.
//
// Example usage:
//
// @docextratypes [
//   {description: 'Options 1', symbol: 'MyOptions1'},
//   {description: 'Options 2', symbol: 'MyOptions2'}
// ]
//
// This will produce:
//
// Options 1:
//     field1-1: ...
//     field1-2: ...
//
// Options 2:
//     field2-1: ...
//     field2-2: ...
//
// For now it is only supported in class comments.
const DOCUMENTATION_EXTRA_TYPES = 'docextratypes';

// By default, we don't "unpack" the return type. But sometimes it is useful to
// let users know what the return type looks like. Use this decorator to specify
// a list of types to show documents for after the document line of the return
// statement.
//
// TODO: in theory, it is possible to automatically extract (nested) types from
// the return type, but it requires more work. For now, we ask users to
// explicitly list the types in this decorator.
//
// Example usage:
//
// @docunpackreturn ['MyOptions', 'MySubFieldType']
//
// This will produce:
//
// MyOptions:
//     field1-1: ...
//     field1-2: ...
//
// MySubFieldType::
//     field2-1: ...
const DOCUMENTATION_UNPACK_RETURN = 'docunpackreturn';

const DOCUMENTATION_UNPACK_TYPE = 'docunpacktype';
const IN_NAMESPACE_JSDOC = 'innamespace';
const DOCUMENTATION_TAGS = 'doctags';

/**
 * Parses the program.
 */
export function parse(
    programRoot: string, srcRoot: string, repoPath: string, githubRoot: string,
    allowedDeclarationFileSubpaths: string[], isFile: boolean, parseVariables: boolean):
    RepoDocsAndMetadata {
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
  const inlineTypes: {[typeName: string]: string} = {};

  // Use the same compiler options that we use to compile the library
  // here.
  const tsconfig =
      JSON.parse(fs.readFileSync(path.join(repoPath, 'tsconfig.json'), 'utf8'));
  delete tsconfig.compilerOptions.moduleResolution;

  const program = ts.createProgram([programRoot], tsconfig.compilerOptions);
  const checker = program.getTypeChecker();

  // Visit all the nodes that are transitively linked from the source
  // root.
  const sourceFiles = isFile ? [program.getSourceFile(programRoot)] :
    program.getSourceFiles();
  for (const sourceFile of sourceFiles) {
    if (!sourceFile.isDeclarationFile ||
        allowedDeclarationFileSubpaths.some(
            allowedPath => sourceFile.fileName.includes(allowedPath))) {
      ts.forEachChild(
          sourceFile,
          node => visitNode(
              docHeadings, subclassMethodMap, docTypeAliases, docLinkAliases,
              globalSymbolDocMap, configInterfaceParamMap, inlineTypes, checker,
              node, sourceFile, srcRoot, repoPath, githubRoot, parseVariables));
    }
  }

  util.replaceUseDocsFromDocStrings(docHeadings, globalSymbolDocMap);
  util.addSubclassMethods(docHeadings, subclassMethodMap);

  const docs: Docs = {headings: docHeadings};

  return {
    docs,
    docLinkAliases,
    configInterfaceParamMap,
    inlineTypes,
    docTypeAliases
  };
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
    inlineTypes: {[typeName: string]: string}, checker: ts.TypeChecker,
    node: ts.Node, sourceFile: ts.SourceFile, srcRoot: string, repoPath: string,
    githubRoot: string, parseVariables: boolean) {
  if (ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) {
    const docInfo = util.getDocDecoratorOrAnnotation(
        checker, node, DOCUMENTATION_DECORATOR_AND_ANNOTATION);

    if (docInfo != null && !sourceFile.isDeclarationFile) {
      const subheading =
          util.fillHeadingsAndGetSubheading(docInfo, docHeadings);

      const docFunction = serializeMethodOrFunction(
          checker, node, docInfo, sourceFile, repoPath, srcRoot, githubRoot);

      // Static methods are top-level functions.
      if (ts.isFunctionDeclaration(node) || util.isStatic(node)) {
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
    const docInfo = util.getDocDecoratorOrAnnotation(
        checker, node, DOCUMENTATION_DECORATOR_AND_ANNOTATION);
    if (docInfo != null && !sourceFile.isDeclarationFile) {
      const subheading =
          util.fillHeadingsAndGetSubheading(docInfo, docHeadings);

      subheading.symbols.push(serializeClass(
          checker, node, docInfo, sourceFile, docHeadings, repoPath, srcRoot,
          githubRoot));
    }

    // You can't use both doc link aliases and @doc decorators.
    if (docInfo != null &&
        util.getJsdoc(checker, node, DOCUMENTATION_TYPE_ALIAS) != null) {
      throw new Error(
          `Class ${node.name.getText()} has both a ` +
          `doc link alias and a doc decorator.`);
    }

  // Both `var` or `const` will be parsed.
  } else if (parseVariables && ts.isVariableDeclaration(node)) {
    const docInfo = util.getDocDecoratorOrAnnotation(
      checker, node, DOCUMENTATION_DECORATOR_AND_ANNOTATION);

    if (docInfo != null && !sourceFile.isDeclarationFile) {
      const subheading =
          util.fillHeadingsAndGetSubheading(docInfo, docHeadings);

      const docVariable = serializeVariable(
          checker, node, docInfo, sourceFile, repoPath, srcRoot, githubRoot);
      subheading.symbols.push(docVariable);
    }
  }

  if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node) || ts.isClassDeclaration(node)) {
    // @docalias
    const docAlias = util.getJsdoc(checker, node, DOCUMENTATION_TYPE_ALIAS);
    if (docAlias != null) {
      const symbol = checker.getSymbolAtLocation(node.name);
      docTypeAliases[symbol.getName()] = docAlias;
    }

    // @doclink
    const docLinkAlias = util.getJsdoc(checker, node, DOCUMENTATION_LINK_ALIAS);
    if (docLinkAlias != null) {
      docLinkAliases[node.name.getText()] = docLinkAlias;
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
    let documentation =
        ts.displayPartsToString(symbol.getDocumentationComment(checker));
    documentation = util.removeStarsFromCommentString(documentation);

    const signature = type.getCallSignatures()[0];

    let params = [];
    if (signature != null && signature.parameters != null) {
      const identifierGenericMap = ts.isMethodDeclaration(node) ?
          util.getIdentifierGenericMap(node) :
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
    // Never allow the Tensor type to be unpacked
    // Note for future: This _may_ have started happening when the
    // `export declare namespace Tensor {}` was added in tensorflow core
    // If this happens to other symbols infuture we may want to look into a more
    // general way to detect this, however tscompiler API docs are sparse so
    // the explicit solution below has that in its favor.
    if (symbol.getName() !== 'Tensor') {
      const namespace = util.getJsdoc(checker, node, IN_NAMESPACE_JSDOC);
      const symbolPath =
          (namespace != null ? namespace + '.' : '') + symbol.getName();
      configInterfaceParamMap[symbolPath] =
          serializeInterfaceParams(checker, symbol);
    }
  }

  // Map types to their text so we inline them.
  if (ts.isTypeAliasDeclaration(node)) {
    const symbol = checker.getSymbolAtLocation(node.name);

    const docInline = util.getJsdoc(checker, node, DOCUMENTATION_INLINE);
    if (docInline != null) {
      node.forEachChild(child => {
        if (ts.isTypeNode(child)) {
          inlineTypes[symbol.getName()] = child.getText();
        }
      });
    }

    const docUnpackType =
        util.getJsdoc(checker, node, DOCUMENTATION_UNPACK_TYPE);
    if (docUnpackType != null) {
      // Unpack the type
      const symbolPath = symbol.getName();
      inlineTypes[symbolPath] = serializeUnpackedUnionType(checker, node);
    }
  }

  ts.forEachChild(
      node,
      node => visitNode(
          docHeadings, subclassMethodMap, docTypeAliases, docLinkAliases,
          globalSymbolDocMap, configInterfaceParamMap, inlineTypes, checker,
          node, sourceFile, srcRoot, repoPath, githubRoot, parseVariables));
}

export function serializeVariable(
    checker: ts.TypeChecker, node: ts.VariableDeclaration, docInfo: util.DocInfo,
    sourceFile: ts.SourceFile, repoPath: string,
    srcRoot: string, githubRoot: string): DocVariable {
  const symbol = checker.getSymbolAtLocation(node.name);
  const name = symbol.getName();

  const {displayFilename, githubUrl} =
      util.getFileInfo(node, sourceFile, repoPath, srcRoot, githubRoot);

  let documentation =
      ts.displayPartsToString(symbol.getDocumentationComment(checker));
  documentation = util.removeStarsFromCommentString(documentation);
  const docVariable: DocVariable = {
    docInfo: docInfo,
    symbolName: name,
    namespace: docInfo.namespace,
    documentation,
    fileName: displayFilename,
    githubUrl,
    tags: getTags(checker, node),
    isVariable: true
  };

  return docVariable;
}

export function serializeClass(
    checker: ts.TypeChecker, node: ts.ClassDeclaration, docInfo: util.DocInfo,
    sourceFile: ts.SourceFile, docHeadings: DocHeading[], repoPath: string,
    srcRoot: string, githubRoot: string): DocClass {
  const symbol = checker.getSymbolAtLocation(node.name);
  const name = symbol.getName();

  // Parse inheritance clauses if they exist.
  let inheritsFrom = null;
  if (node.heritageClauses != null) {
    const extendsSymbols: string[] = [];
    node.heritageClauses.forEach(heritageClause => {
      heritageClause.types.forEach(type => {
        extendsSymbols.push(type.getText());
      });
    });
    inheritsFrom = extendsSymbols.join('|');
  }

  const {displayFilename, githubUrl} =
      util.getFileInfo(node, sourceFile, repoPath, srcRoot, githubRoot);

  let documentation =
      ts.displayPartsToString(symbol.getDocumentationComment(checker));
  documentation = util.removeStarsFromCommentString(documentation);
  const docClass: DocClass = {
    docInfo: docInfo,
    symbolName: name,
    namespace: docInfo.namespace,
    documentation,
    fileName: displayFilename,
    githubUrl,
    methods: [],
    tags: getTags(checker, node),
    isClass: true
  };
  if (inheritsFrom != null) {
    // Identifier generic map can be undefined here because we just want to
    // remove generics from the type.
    const identifierGenericMap = {};
    docClass.inheritsFrom = util.sanitizeTypeString(inheritsFrom, {});
  }

  // Parse the methods that are annotated with @doc.
  node.members.forEach(member => {
    if (ts.isMethodDeclaration(member) && !util.isStatic(member)) {
      const docInfo = util.getDocDecoratorOrAnnotation(
          checker, member, DOCUMENTATION_DECORATOR_AND_ANNOTATION);
      if (docInfo != null) {
        docClass.methods.push(serializeMethodOrFunction(
            checker, member, docInfo, sourceFile, repoPath, srcRoot,
            githubRoot));
      }
    }
  });

  // Fill in `extraTypes` if specified.
  const docExtraTypes =
      util.getDocDecoratorOrAnnotation(
          checker, node, DOCUMENTATION_EXTRA_TYPES) as {} as DocExtraType[];
  if (docExtraTypes != null) {
    docClass.extraTypes = docExtraTypes;
  }

  return docClass;
}

export function serializeMethodOrFunction(
    checker: ts.TypeChecker, node: ts.MethodDeclaration|ts.FunctionDeclaration,
    docInfo: util.DocInfo, sourceFile: ts.SourceFile, repoPath: string,
    srcRoot: string, githubRoot: string): DocFunction {
  const stripSymbolUnderscoreSuffix = ts.isFunctionDeclaration(node);

  if (!sourceFile.fileName.startsWith(repoPath)) {
    throw new Error(
        `Error: source file ${sourceFile.fileName} ` +
        `does not start with srcPath provided ${repoPath}.`);
  }

  const symbol = checker.getSymbolAtLocation(node.name);
  const type =
      checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!);
  const signature = type.getCallSignatures()[0];

  let symbolName = symbol.name;
  if (stripSymbolUnderscoreSuffix) {
    if (symbolName.endsWith('_')) {
      symbolName = symbolName.substring(0, symbolName.length - 1);
    }
  }

  const identifierGenericMap = util.getIdentifierGenericMap(node);

  const isConfigParam = false;
  const parameters = signature.parameters.map(
      (param: ts.Symbol) => serializeParameter(
          checker, param, identifierGenericMap, isConfigParam));
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

  let documentation =
      ts.displayPartsToString(signature.getDocumentationComment(checker));
  documentation = util.removeStarsFromCommentString(documentation);

  const method: DocFunction = {
    docInfo: docInfo,
    symbolName,
    namespace: docInfo.namespace,
    paramStr,
    parameters,
    returnType,
    documentation,
    fileName: displayFilename,
    githubUrl,
    tags: getTags(checker, node),
    isFunction: true
  };

  // Unpack return types.
  const docUnpackReturnTypes =
      util.getDocDecoratorOrAnnotation(
          checker, node, DOCUMENTATION_UNPACK_RETURN) as {} as string[];
  if (docUnpackReturnTypes != null) {
    method.unpackedReturnTypes = docUnpackReturnTypes.map(t => {
      return {
        description: '`' + t + '`',
        symbol: t,
      };
    })
  }

  return method;
}

function getTags(checker: ts.TypeChecker, node: ts.MethodDeclaration|ts.FunctionDeclaration|
  ts.ClassDeclaration|ts.VariableDeclaration) {
  const docTags = util.getJsdoc(checker, node, DOCUMENTATION_TAGS);
  return docTags == null ? [] : docTags.replace(/\s/g, '').split(/,/g);
}

function serializeParameter(
    checker: ts.TypeChecker, symbol: ts.Symbol,
    identifierGenericMap: {[identifier: string]: string},
    isConfigParam: boolean): DocFunctionParam {
  let name = symbol.getName();
  if (util.hasSpreadOperator(symbol)) {
    name = '...' + name;
  }

  return {
    name,
    documentation:
        ts.displayPartsToString(symbol.getDocumentationComment(checker)),
    type: util.parameterTypeToString(checker, symbol, identifierGenericMap),
    optional: checker.isOptionalParameter(
        symbol.valueDeclaration as ts.ParameterDeclaration),
    isConfigParam
  };
}

function serializeInterfaceParams(
    checker: ts.TypeChecker, symbol: ts.Symbol): DocFunctionParam[] {
  const type = checker.getDeclaredTypeOfSymbol(symbol);
  const properties = checker.getPropertiesOfType(type)
  const params: DocFunctionParam[] = properties.map(prop => {
    const name = prop.getName();
    // Note: This is where we could recurse to serialize nested interface types
    // The display of such an interface might be confusing though.

    // We don't support generics on interfaces yet, so pass an empty
    // generic map.
    const identifierGenericMap = {};
    const paramType =
        util.parameterTypeToString(checker, prop, identifierGenericMap);
    const documentation =
        ts.displayPartsToString(prop.getDocumentationComment(checker));
    const optional = checker.isOptionalParameter(
        symbol.valueDeclaration as ts.ParameterDeclaration);

    return {
      name,
      type: paramType,
      documentation,
      optional,
      isConfigParam: true,
    };
  });
  return params;
}

function serializeUnpackedUnionType(
    checker: ts.TypeChecker, node: ts.TypeAliasDeclaration): string {
  const typeStringComponents = [];

  if (ts.isUnionTypeNode(node.type)) {
    const unionTypeMembers = node.type.types;
    unionTypeMembers.forEach((typeNode) => {
      const memberType = checker.getTypeFromTypeNode(typeNode);
      const properties = memberType.getProperties();
      if (properties.length === 0) {
        typeStringComponents.push(typeNode.getText());
      } else {
        const subTypeComponents = [];
        properties.forEach(property => {
          const propName = property.getName();
          const propType = util.parameterTypeToString(checker, property, {});
          subTypeComponents.push(`${propName}: ${propType}`)
        });
        const subTypeString = `{${subTypeComponents.join(', ')}}`
        typeStringComponents.push(subTypeString)
      }
    });
    return typeStringComponents.join('|');
  } else {
    return node.type.getText();
  }
}
