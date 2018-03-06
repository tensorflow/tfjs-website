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
import * as mkdirp from 'mkdirp';
import * as shell from 'shelljs';
import * as ts from 'typescript';
import * as commander from 'commander';

import * as parser from './api-parser';
import * as util from './api-util';

commander.option('--in <path>', 'main source entry')
    .option('--package <path>', 'Package.json path')
    .option('--src <path>', 'Path to src folder of repo')
    .option('--repo <path>', 'Path to repo')
    .option('--bundle  <path>', 'JS Bundle Path')
    .option('--github <url>', 'Github repository URL')
    .option('--out <path>', 'Output Path')
    .parse(process.argv);


const allParamsPresent = [
  commander.in, commander.package, commander.src, commander.bundle,
  commander.github, commander.out
].every((param) => param !== undefined);

if (!allParamsPresent) {
  console.log('Missing arguments to make-api.ts');
  process.exit(1);
}


    const outputDir = path.dirname(commander.out);
mkdirp(outputDir, (err: any) => {
  if (err) {
    console.log("Error creating output dir", outputDir);
    process.exit(1);
  }
});


// Parse the library for docs.
const {docs, docLinkAliases} = parser.parse(commander.in, 
  commander.src, 
  commander.repo,
  commander.github);
docs.bundleJsPath = commander.bundle;


const TOPLEVEL_NAMESPACE = 'dl';
// Predefine some custom type links.
// TODO: Move this somewhere else
const symbols: util.SymbolAndUrl[] = [
  {
    symbolName: 'TypedArray',
    url: 'https://developer.mozilla.org/en-US/docs/Web/' +
        'JavaScript/Reference/Global_Objects/TypedArray',
    type: 'class'
  },
  {
    symbolName: 'ImageData',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/ImageData',
    type: 'class'
  },
  {
    symbolName: 'HTMLImageElement',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement',
    type: 'class'
  },
  {
    symbolName: 'HTMLCanvasElement',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement',
    type: 'class'
  },
  {
    symbolName: 'HTMLVideoElement',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement',
    type: 'class'
  }
];
util.linkSymbols(docs, symbols, TOPLEVEL_NAMESPACE, docLinkAliases);

// Write the JSON.
mkdirp.sync(path.dirname(commander.out));
fs.writeFileSync(commander.out, JSON.stringify(docs, null, 2));

// Compute some statics and render them.
const {headingsCount, subheadingsCount, methodCount} =
    util.computeStatistics(docs);
console.log(
    `API reference written to ${commander.out}\n` +
    `Found: \n` +
    `  ${headingsCount} headings\n` +
    `  ${subheadingsCount} subheadings\n` +
    `  ${methodCount} methods`);



