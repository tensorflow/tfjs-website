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
import * as ts from 'typescript';

// tslint:disable-next-line:max-line-length
import {DocClass, DocFunction, DocFunctionParam, DocHeading, Docs, DocSubheading} from './view';

// Mirrors the info argument to @doc in decorators.ts.
export interface DocInfo {
  heading: string;
  subheading: string;
  namespace?: string;
  subclasses?: string[];
  useDocsFrom?: string;
  configParamIndices?: number[];
}

export function getDocDecorator(node: ts.Node, decoratorName: string): DocInfo {
  let docInfo: DocInfo;
  if (node.decorators != null) {
    docInfo = parseDocDecorators(node.decorators, decoratorName);
  }
  return docInfo;
}

/**
 * Parses the @doc annotation and returns the typed DocInfo object.
 */
export function parseDocDecorators(
    decorators: ts.NodeArray<ts.Decorator>, decoratorName: string): DocInfo {
  let docInfo: DocInfo = null;
  decorators.map(decorator => {
    const decoratorStr = decorator.getText();
    if (decoratorStr.startsWith('@' + decoratorName)) {
      const decoratorConfigStr =
          decoratorStr.substring(decoratorName.length + 1);
      docInfo = eval(decoratorConfigStr);
      if (docInfo.subheading == null) {
        docInfo.subheading = '';
      }
    }
  });
  return docInfo;
}

export function addSubclassMethods(
    docHeadings: DocHeading[],
    subclassMethodMap: {[subclass: string]: DocFunction[]}) {
  const subclasses = Object.keys(subclassMethodMap);
  subclasses.forEach(subclass => {
    const methods = subclassMethodMap[subclass];
    // Find the class.
    for (let i = 0; i < docHeadings.length; i++) {
      const heading = docHeadings[i];
      for (let j = 0; j < heading.subheadings.length; j++) {
        const subheading = heading.subheadings[j];
        if (subheading.symbols == null) {
          throw new Error(
              `Subheading '${subheading.name}' has no symbols. ` +
              `Please remove it from the predefined docHeadings, or ` +
              `add methods to the subheading in the code with @doc.`);
        }

        for (let k = 0; k < subheading.symbols.length; k++) {
          const symbol = subheading.symbols[k];
          if (symbol['isClass'] != null && symbol.symbolName === subclass) {
            const classSymbol = symbol as DocClass;
            methods.forEach(method => classSymbol.methods.push(method));
          }
        }
      }
    }
  });
}

export function unpackConfigParams(
    docHeadings: DocHeading[],
    configInterfaceParamMap: {[interfaceName: string]: DocFunctionParam[]}) {
  foreachDocFunction(docHeadings, docFunction => {
    if (docFunction.docInfo.configParamIndices != null) {
      const params = [];
      for (let i = 0; i < docFunction.parameters.length; i++) {
        const configParamName = docFunction.parameters[i].name;
        params.push(docFunction.parameters[i]);

        if (docFunction.docInfo.configParamIndices.indexOf(i) != -1) {
          const types = docFunction.parameters[i].type.split('|');
          let configParams: DocFunctionParam[] = null;
          types.forEach(underlyingType => {
            underlyingType = underlyingType.trim();
            if (configInterfaceParamMap[underlyingType] != null) {
              configParams = configInterfaceParamMap[underlyingType];
            }
          })
          if (configParams == null) {
            throw new Error(
                `Could not find config interface definition for ` +
                `${docFunction.symbolName}, config type ` +
                `${docFunction.parameters[i].type}, param ` +
                `${configParamName} index ${i}. Please make sure ` +
                `configParamIndices is set properly and the config interface ` +
                `is documented.`);
          }
          configParams.forEach(configParam => {
            params.push(configParam);
          });
          // Hide the original type of the config.
          docFunction.parameters[i].type = 'Object';
        }
      }
      docFunction.parameters = params;
    }
  });
}


export function replaceUseDocsFromDocStrings(
    docHeadings: DocHeading[],
    globalSymbolDocMap:
        {[symbolName: string]: {docs: string, params: DocFunctionParam[]}}) {
  foreachDocFunction(docHeadings, docFunction => {
    if (docFunction.docInfo.useDocsFrom != null &&
        globalSymbolDocMap[docFunction.docInfo.useDocsFrom] != null) {
      docFunction.documentation =
          globalSymbolDocMap[docFunction.docInfo.useDocsFrom].docs;
      const params =
          globalSymbolDocMap[docFunction.docInfo.useDocsFrom].params || [];

      // Replace params from useDocsFrom only when param names line up.
      for (let i = 0; i < docFunction.parameters.length; i++) {
        params.forEach(param => {
          if (param.name === docFunction.parameters[i].name) {
            docFunction.parameters[i] = param;
          }
        });
      }
    }
  });
}

// Parse the file info, github URL and filename from a node.
export function getFileInfo(
    node: ts.Node, sourceFile: ts.SourceFile, repoPath: string, srcRoot: string,
    githubRoot: string): {displayFilename: string, githubUrl: string} {
  // Line numbers are 0-indexed.
  const startLine =
      sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const endLine =
      sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  const fileName = sourceFile.fileName.substring(repoPath.length + '/'.length);
  const displayFilename = fileName.substring(srcRoot.length) + '#' + startLine;

  const githubUrl =
      `${githubRoot}/blob/master/${fileName}#L${startLine}-L${endLine}`;
  return {displayFilename, githubUrl};
}

// Given a newly seen docInfo from a @doc annotation, fill in headings /
// subheadings and return the subheading.
export function fillHeadingsAndGetSubheading(
    docInfo: DocInfo, docHeadings: DocHeading[]): DocSubheading {
  // Find the heading.
  let heading: DocHeading;
  for (let i = 0; i < docHeadings.length; i++) {
    if (docHeadings[i].name === docInfo.heading) {
      heading = docHeadings[i];
    }
  }
  if (heading == null) {
    heading = {name: docInfo.heading, description: '', subheadings: []};
    docHeadings.push(heading);
  }

  // Find the subheading.
  let subheading: DocSubheading;
  for (let i = 0; i < heading.subheadings.length; i++) {
    if (heading.subheadings[i].name === docInfo.subheading) {
      subheading = heading.subheadings[i];
    }
  }
  if (subheading == null) {
    subheading = {name: docInfo.subheading, symbols: []};
    heading.subheadings.push(subheading);
  }
  if (subheading.symbols == null) {
    subheading.symbols = [];
  }
  return subheading;
}

export function computeStatistics(docs: Docs):
    {headingsCount: number, subheadingsCount: number, methodCount: number} {
  let subheadingsCount = 0;
  let methodCount = 0;
  for (let i = 0; i < docs.headings.length; i++) {
    const heading = docs.headings[i];
    subheadingsCount += heading.subheadings.length;
    for (let j = 0; j < heading.subheadings.length; j++) {
      methodCount += heading.subheadings[j].symbols.length;
    }
  }
  return {headingsCount: docs.headings.length, subheadingsCount, methodCount};
}

// Sorts the doc headings.
export function sortMethods(
    docs: Docs, pins: {[heading: string]: {[subheading: string]: string[]}}) {
  const docHeadings = docs.headings;
  // Sort the methods by name.
  for (let i = 0; i < docHeadings.length; i++) {
    const heading = docHeadings[i];
    for (let j = 0; j < heading.subheadings.length; j++) {
      const subheading = heading.subheadings[j];
      if (subheading.symbols == null) {
        subheading.symbols = [];
      }

      // Pin the symbols in order of the pins.
      const pinnedSymbols = [];
      if (pins[heading.name] != null &&
          pins[heading.name][subheading.name] != null) {
        const pin = pins[heading.name][subheading.name];
        pin.forEach(pinnedSymbolName => {
          // Loop backwards so we remove symbols.
          for (let k = subheading.symbols.length - 1; k >= 0; k--) {
            const symbol = subheading.symbols[k];
            if (symbol.symbolName === pinnedSymbolName) {
              pinnedSymbols.push(symbol);
              subheading.symbols.splice(k, 1);
            }
          }
        });
      }

      // Sort non-pinned symbols by name.
      subheading.symbols.sort((a, b) => {
        if (a.symbolName < b.symbolName) {
          return -1;
        } else if (a.symbolName > b.symbolName) {
          return 1;
        }
        return 0;
      });

      subheading.symbols = pinnedSymbols.concat(subheading.symbols);
    }
  }
}

export function kind(node: ts.Node): string {
  const keys = Object.keys(ts.SyntaxKind);
  for (let i = 0; i < keys.length; i++) {
    if (ts.SyntaxKind[keys[i]] === node.kind) {
      return keys[i];
    }
  }
  return null;
}

export function isStatic(node: ts.MethodDeclaration): boolean {
  let isStatic = false;
  node.forEachChild(child => {
    if (child.kind === ts.SyntaxKind.StaticKeyword) {
      isStatic = true;
    }
  });
  return isStatic;
}

/**
 * Finds a jsdoc tag by a given tag name for a symbol. e.g. @docalias number[]
 * => number[].
 */
export function getJsdoc(
    checker: ts.TypeChecker,
    node: ts.InterfaceDeclaration|ts.TypeAliasDeclaration|ts.ClassDeclaration|
    ts.EnumDeclaration,
    tag: string): string {
  const symbol = checker.getSymbolAtLocation(node.name);
  const docs = symbol.getDocumentationComment(undefined);
  const tags = symbol.getJsDocTags();
  for (let i = 0; i < tags.length; i++) {
    const jsdocTag = tags[i];
    if (jsdocTag.name === tag) {
      return jsdocTag.text != null ? jsdocTag.text.trim() : '';
    }
  }
  return null;
}

/**
 * Converts a function parameter symbol to its string type value.
 */
export function parameterTypeToString(
    checker: ts.TypeChecker, symbol: ts.Symbol,
    identifierGenericMap: {[identifier: string]: string}): string {
  const valueDeclaration = symbol.valueDeclaration;

  // Look for type nodes that aren't null and get the full text of the type
  // node, falling back to using the checker to serialize the type.
  let typeStr;
  symbol.valueDeclaration.forEachChild(child => {
    if (ts.isTypeNode(child) && child.kind !== ts.SyntaxKind.NullKeyword) {
      typeStr = child.getText();
    }
  });
  if (typeStr == null) {
    // Fall back to using the checkers method for converting the type to a
    // string.
    typeStr = checker.typeToString(
        checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!));
  }

  return sanitizeTypeString(typeStr, identifierGenericMap);
}

/**
 * Sanitizes a type string by removing generics and replacing generics.
 *   e.g. Tensor<R> => Tensor
 *   e.g. T => Tensor
 */
export function sanitizeTypeString(
    typeString: string, identifierGenericMap: {[identifier: string]: string}) {
  // If the return type is part of the generic map, use the mapped
  // type. For example, <T extends Tensor> will replace "T" with
  // "Tensor".
  Object.keys(identifierGenericMap).forEach(identifier => {
    const re = new RegExp('\\b' + identifier + '\\b', 'g');
    typeString = typeString.replace(re, identifierGenericMap[identifier]);
  });

  // Remove generics.
  typeString = typeString.replace(/(<.*>)/, '');

  return typeString;
}

/**
 * Computes a mapping of identifier to their generic type. For example:
 *   method<T extends Tensor>() {}
 * In this example, this method will return {'T': 'Tensor'}.
 */
export function getIdentifierGenericMap(
    node: ts.MethodDeclaration,
    nameRemove: string): {[generic: string]: string} {
  const identifierGenericMap = {};

  node.forEachChild(child => {
    // TypeParameterDeclarations look like <T extends Tensor|NamedTensorMap>.
    if (ts.isTypeParameterDeclaration(child)) {
      let identifier;
      let generic;
      child.forEachChild(cc => {
        // Type nodes are "Tensor|NamedTensorMap"
        // Identifier nodes are "T".
        if (ts.isTypeNode(cc)) {
          generic = cc.getText();
        } else if (ts.isIdentifier(cc)) {
          identifier = cc.getText();
        }
      });
      if (identifier != null && generic != null) {
        identifierGenericMap[identifier] = generic;
      }
    }
  });

  return identifierGenericMap;
}

/**
 * Iterate over all functions in the docs.
 */
export function foreachDocFunction(
    docHeadings: DocHeading[], fn: (docFunction: DocFunction) => void) {
  docHeadings.forEach(heading => {
    if (heading.subheadings == null) {
      return;
    }
    heading.subheadings.forEach(subheading => {
      if (subheading.symbols == null) {
        return;
      }
      subheading.symbols.forEach(untypedSymbol => {
        if (untypedSymbol['isClass']) {
          const symbol = untypedSymbol as DocClass;
          symbol.methods.forEach(method => {
            fn(method);
          });
        } else {
          fn(untypedSymbol as DocFunction);
        }
      });
    });
  });
}

/**
 * Replace all types with their aliases. e.g. ShapeMap[R2] => number[]
 */
export function replaceDocTypeAliases(
    docHeadings: DocHeading[], docTypeAliases: {[type: string]: string}) {
  foreachDocFunction(docHeadings, docFunction => {
    docFunction.parameters.forEach(param => {
      param.type = replaceDocTypeAlias(param.type, docTypeAliases);
    });
    docFunction.returnType =
        replaceDocTypeAlias(docFunction.returnType, docTypeAliases);
  });
}

export function replaceDocTypeAlias(
    docTypeString: string, docTypeAliases: {[type: string]: string}): string {
  Object.keys(docTypeAliases).forEach(type => {
    if (docTypeString.indexOf(type) !== -1) {
      const re = new RegExp('\\b' + type + '\\b(\\[.+\\])?', 'g');
      docTypeString = docTypeString.replace(re, docTypeAliases[type]);
    }
  });
  return docTypeString;
}

export function inlineTypes(
    docHeadings: DocHeading[], types: {[typeName: string]: string}) {
  Object.keys(types).forEach(typeName => {
    const re = getSymbolReplaceRegex(typeName, false /** isMarkdown */);
    foreachDocFunction(docHeadings, docFunction => {
      docFunction.parameters.forEach(param => {
        param.type = param.type.replace(re, types[typeName]);
      });
    });
  });
}

export interface SymbolAndUrl {
  // How the symbol should be referred to in other locations in docs.
  referenceName: string;
  // The name of the symbol, no namespaces.
  symbolName: string;
  url: string;
  type: 'function'|'class'|'method';
  toplevelNamespace?: string;
}

/**
 * Adds markdown links for reference symbols in documentation, parameter
 * types, and return types. Uses @doclink aliases to link displayed symbols to
 * another symbol's documentation.
 */
export function linkSymbols(
    docs: Docs, symbols: SymbolAndUrl[], toplevelNamespace: string,
    docLinkAliases: {[symbolName: string]: string}) {
  // Find all the symbols.
  docs.headings.forEach(heading => {
    heading.subheadings.forEach(subheading => {
      subheading.symbols.forEach(symbol => {
        const namespace =
            (symbol.namespace != null && symbol.namespace != '' ?
                 symbol.namespace + '.' :
                 '');

        symbol.displayName =
            toplevelNamespace + '.' + namespace + symbol.symbolName;

        const referenceName = namespace + symbol.symbolName;
        symbol.urlHash = (symbol['isClass'] ? 'class:' : '') + referenceName;

        symbols.push({
          referenceName,
          symbolName: symbol.symbolName,
          url: '#' + symbol.urlHash,
          type: symbol['isClass'] != null ? 'class' : 'function',
          toplevelNamespace
        });

        if (symbol['isClass'] != null) {
          const docClass = symbol as DocClass;
          docClass.methods.forEach(method => {
            method.urlHash = docClass.displayName + '.' + method.symbolName;
            symbols.push({
              referenceName: referenceName + '.' + method.symbolName,
              symbolName: method.symbolName,
              url: '#' + method.urlHash,
              type: 'method',
              toplevelNamespace
            });
          });
        }
      });
    });
  });

  // Add new doc link alias symbols.
  Object.keys(docLinkAliases).forEach(docLinkAlias => {
    // Find the symbol so we can find the url hash.
    symbols.forEach(symbol => {
      if (symbol.symbolName === docLinkAliases[docLinkAlias]) {
        symbols.push({
          symbolName: docLinkAlias,
          referenceName: docLinkAlias,
          url: symbol.url,
          type: symbol.type,
          toplevelNamespace: symbol.toplevelNamespace
        });
      }
    });
  });

  // Replace class documentation with links.
  docs.headings.forEach(heading => {
    heading.subheadings.forEach(subheading => {
      subheading.symbols.forEach(symbol => {
        if (symbol['isClass']) {
          symbol.documentation = replaceSymbolsWithLinks(
              symbol.documentation, symbols, toplevelNamespace,
              true /** isMarkdown */);
          const classSymbol = symbol as DocClass;
          if (classSymbol.inheritsFrom != null) {
            classSymbol.inheritsFrom = replaceSymbolsWithLinks(
                classSymbol.inheritsFrom, symbols, toplevelNamespace,
                false /** isMarkdown */);
          }
        }
      });
    });
  });

  foreachDocFunction(docs.headings, method => {
    method.documentation = replaceSymbolsWithLinks(
        method.documentation, symbols, toplevelNamespace,
        true /** isMarkdown */);

    // Since automatic types do not have namespaces, we must replace using just
    // the symbol names.
    method.returnType = replaceSymbolsWithLinks(
        method.returnType, symbols, toplevelNamespace, false /** isMarkdown */,
        true /** replaceFromSymbolName */);
    method.parameters.forEach(param => {
      param.documentation = replaceSymbolsWithLinks(
          param.documentation, symbols, toplevelNamespace,
          true /** isMarkdown */);
      param.type = replaceSymbolsWithLinks(
          param.type, symbols, toplevelNamespace, false /** isMarkdown */,
          true /** replaceFromSymbolName */);
    });
  });
}

function replaceSymbolsWithLinks(
    input: string, symbolsAndUrls: SymbolAndUrl[], toplevelNamespace: string,
    isMarkdown: boolean, replaceFromSymbolName = false): string {
  symbolsAndUrls.forEach(symbolAndUrl => {
    const re = getSymbolReplaceRegex(
        replaceFromSymbolName ? symbolAndUrl.symbolName :
                                symbolAndUrl.referenceName,
        isMarkdown);

    let displayText = (symbolAndUrl.toplevelNamespace != null ?
                           symbolAndUrl.toplevelNamespace + '.' :
                           '') +
        symbolAndUrl.referenceName;
    if (symbolAndUrl.type === 'function' || symbolAndUrl.type === 'method') {
      displayText += '()';
    }

    input = input.replace(re, `[${displayText}](${symbolAndUrl.url})`);
  });
  return input;
}

function getSymbolReplaceRegex(symbolName: string, isMarkdown: boolean) {
  const wrapper = isMarkdown ? '\`' : '\\b(?![\'\:])';
  const re = new RegExp(wrapper + symbolName + wrapper, 'g');
  return re;
}
