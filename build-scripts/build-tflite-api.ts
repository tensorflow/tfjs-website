/**
 * @license
 * Copyright 2021 Google Inc. All Rights Reserved.
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
import * as path from 'path';

import {generateDocs, mergeDocs, writeManifestAndTemplate} from './build_api_helpers';

// Get command line params
commander.option('--local', 'use a local build').parse(process.argv);

// Get package.json of website in order to select tflite version
const websitePackage =
    JSON.parse(fs.readFileSync('package.json', {encoding: 'utf8'}));
const tfliteVersion = commander.local ?
    'local' :
    `${websitePackage.dependencies['@tensorflow/tfjs-tflite']}`;
const tfliteTag = `tfjs-tflite-v${tfliteVersion}`

// The tflite docs only use the docs from one library
const libs = [
  {
    packageName: 'tfjs-tflite',
    github: `https://github.com/tensorflow/tfjs/tree/${tfliteTag}/tfjs-tflite`,
    version: tfliteVersion,
    outputFolder: `source/_data/api_tflite/${tfliteVersion}`
  },
];

console.log(`********* Generating Docs *********`);
const outputPaths = generateDocs(libs);

console.log(`********* Merging docs *********`);
const docsFolder = `source/_data/api_tflite`;
const versionedDocsFolder = `${docsFolder}/${tfliteVersion}`
// Note: there isn't really a bundle path that makes sense for tflite, so use
// union package as a fallback.
const bundlePath = commander.bundle && path.resolve(commander.bundle) ||
    path.resolve('node_modules/@tensorflow/tfjs/dist/tf.min.js');
mergeDocs(docsFolder, versionedDocsFolder, outputPaths, bundlePath, 'tflite');

console.log(`********* Writing Manifest & Template *********`);
const docsManifest = {
  tfliteVersion: tfliteVersion,
};
const templateFolder = `source/api_tflite`;
writeManifestAndTemplate(
    docsFolder, versionedDocsFolder, docsManifest, tfliteVersion,
    templateFolder);
