/**
 * @license
 * Copyright 2019 Google Inc. All Rights Reserved.
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

import * as commander from 'commander';
import * as fs from 'fs';
import * as path from 'path';

import {generateDocs, mergeDocs, writeManifestAndTemplate} from './build_api_helpers';

//
// Script Start
//

// Get command line params
commander.option('--local', 'use a local build').parse(process.argv);

// Get package.json of website in order to select vis version
const websitePackage =
    JSON.parse(fs.readFileSync('package.json', {encoding: 'utf8'}));
const visVersion = commander.local ?
    'local' :
    `${websitePackage.dependencies['@tensorflow/tfjs-vis']}`;
const visTag = `v${visVersion}`

// The vis docs only use the docs from one library
const libs = [
  {
    repo: 'tfjs-vis',
    github: `https://github.com/tensorflow/tfjs-vis/blob/${visTag}`,
    version: visVersion,
    outputFolder: `source/_data/api_vis/${visVersion}`
  },
];

console.log(`********* Generating Docs *********`);
const outputPaths = generateDocs(libs);

console.log(`********* Merging docs *********`);
const docsFolder = `source/_data/api_vis`;
const versionedDocsFolder = `${docsFolder}/${visVersion}`
const bundlePath = commander.bundle && path.resolve(commander.bundle) ||
    path.resolve('node_modules/@tensorflow/tfjs-vis/dist/tfjs-vis.umd.min.js');
mergeDocs(docsFolder, versionedDocsFolder, outputPaths, bundlePath, 'tfvis');

console.log(`********* Writing Manifest & Template *********`);
const docsManifest = {
  tfjsVersion: visVersion,
  visVersion,
};
const templateFolder = `source/api_vis`;
writeManifestAndTemplate(
    docsFolder, versionedDocsFolder, docsManifest, visVersion, templateFolder);

// At this point a website build should be able to produce an api docs page
