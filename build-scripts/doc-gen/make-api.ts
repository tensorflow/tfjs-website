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

const commander = require('commander');
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as shell from 'shelljs';
import * as ts from 'typescript';

import * as parser from './parser';
import * as util from './util';

commander.option('--in <path>', 'main source entry')
    .option('--isFile', `If 'in' is a file. If not set, ` +
        `'in' is considered as a package`)
    .option('--package <path>', 'Package.json path')
    .option('--src <path>', 'Path to src folder of repo')
    .option('--repo <path>', 'Path to repo')
    .option('--github <url>', 'Github repository URL')
    .option('--out <path>', 'Output Path')
    .option('--allowed-declaration-file-subpaths <paths>',
        'Sub paths of allowed declaration files, separated by ","')
    .option('--parseVariables', 'If set, the parser will traverse variables too.')
    .parse(process.argv);

const options = commander.opts();

console.log('make-api params', [
  options.in,
  options.isFile,
  options.package,
  options.src,
  options.github,
  options.out,
  options.allowedDeclarationFileSubpaths,
  options.parseVariables
])

const allParamsPresent = [
  options.in,
  options.package,
  options.src,
  options.github,
  options.out,
  options.allowedDeclarationFileSubpaths,
].every((param) => param !== undefined);

if (!allParamsPresent) {
  console.log('Missing arguments to make-api.ts');
  process.exit(1);
}

const outputDir = path.dirname(options.out);
mkdirp(outputDir, (err: any) => {
  if (err) {
    console.log('Error creating output dir', outputDir);
    process.exit(1);
  }
});

// Parse the library for docs.
let repoDocsAndMetadata = parser.parse(
  options.in, options.src, options.repo, options.github,
  options.allowedDeclarationFileSubpaths.split(',').filter(
      ele => ele !== ''), options.isFile, options.parseVariables);

// Write the JSON.
mkdirp.sync(path.dirname(options.out));
fs.writeFileSync(options.out, JSON.stringify(repoDocsAndMetadata, null, 2));

// Compute some statics and render them.
const {headingsCount, subheadingsCount, methodCount} =
    util.computeStatistics(repoDocsAndMetadata.docs);
console.log(
    `API reference written to ${options.out}\n` +
    `Found: \n` +
    `  ${headingsCount} headings\n` +
    `  ${subheadingsCount} subheadings\n` +
    `  ${methodCount} methods`);
