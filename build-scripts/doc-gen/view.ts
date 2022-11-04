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
import {DocInfo} from './util';

// Docs for a single repo.
export interface RepoDocsAndMetadata {
  docs: Docs;
  docLinkAliases: {[symbolName: string]: string};
  configInterfaceParamMap: {[interfaceName: string]: DocFunctionParam[]};
  inlineTypes: {[typeName: string]: string};
  docTypeAliases: {[type: string]: string};
}

export interface Docs {
  headings: DocHeading[];
}

export interface DocHeading {
  name: string;
  description?: string;
  subheadings: DocSubheading[];
}

export interface DocSubheading {
  name: string;
  description?: string;
  symbols?: DocSymbol[];
}

export type DocSymbol = DocFunction|DocClass|DocVariable;

export interface DocClass {
  docInfo: DocInfo;

  symbolName: string;
  namespace: string;
  documentation: string;
  fileName: string;
  githubUrl: string;

  methods: DocFunction[];
  inheritsFrom?: string;

  extraTypes?: DocExtraType[];

  isClass: true;
  tags: string[];

  // Filled in by the linker.
  displayName?: string;
  urlHash?: string;
}

export interface DocFunction {
  docInfo: DocInfo;

  symbolName: string;
  namespace: string;
  documentation: string;
  fileName: string;
  githubUrl: string;

  parameters: DocFunctionParam[];
  paramStr: string;
  returnType: string;

  unpackedReturnTypes?: DocExtraType[];

  isFunction: true;
  tags: string[];

  // Filled in by the linker.
  displayName?: string;
  urlHash?: string;
}

export interface DocFunctionParam {
  name: string;
  type: string;
  optional: boolean;
  documentation: string;
  isConfigParam: boolean;
}

export interface DocExtraType {
  description: string;
  symbol: string;
  params?: DocFunctionParam[];
}

export interface DocVariable {
  docInfo: DocInfo;

  symbolName: string;
  namespace: string;
  documentation: string;
  fileName: string;
  githubUrl: string;

  isVariable: true;
  tags: string[];

  // Filled in by the linker.
  displayName?: string;
  urlHash?: string;
}
