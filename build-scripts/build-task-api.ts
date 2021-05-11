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

import * as commander from 'commander';
import * as fs from 'fs';
import * as path from 'path';

import {generateDocs, LibraryInfo, mergeDocs, writeManifestAndTemplate} from './build_api_helpers';

// Get command line params
commander.option('--local', 'use a local build').parse(process.argv);

// Get package.json of website in order to select task API version
const websitePackage =
    JSON.parse(fs.readFileSync('package.json', {encoding: 'utf8'}));
const taskApiVersion = commander.local ?
    'local' :
    `${websitePackage.dependencies['@tensorflow-models/tasks']}`;
const taskApiTag = `tasks-v${taskApiVersion}`

// The task API docs only use the docs from one library
const libs: LibraryInfo[] = [
  {
    repoName: 'tfjs-models',
    packageName: 'tasks',
    github:
        `https://github.com/tensorflow/tfjs-models/tree/${taskApiTag}/tasks`,
    version: taskApiVersion,
    outputFolder: `source/_data/api_tasks/${taskApiVersion}`,
    // Allow to extract docs related data from the following dependent packages.
    // Add more as needed.
    allowedDeclarationFileSubpaths: [
      'tasks/node_modules/@tensorflow-models/mobilenet',
    ],
  },
];

console.log(`********* Generating Docs *********`);
const outputPaths = generateDocs(libs);
console.log(outputPaths);

console.log(`********* Merging docs *********`);
const docsFolder = `source/_data/api_tasks`;
const versionedDocsFolder = `${docsFolder}/${taskApiVersion}`
// Note: there isn't really a bundle path that makes sense for tasks API, so use
// union package as a fallback.
const bundlePath = commander.bundle && path.resolve(commander.bundle) ||
    path.resolve('node_modules/@tensorflow/tfjs/dist/tf.min.js');
mergeDocs(docsFolder, versionedDocsFolder, outputPaths, bundlePath, 'tfTask');

console.log(`********* Writing Manifest & Template *********`);
const docsManifest = {
  taskApiVersion,
};
const templateFolder = `source/api_tasks`;
writeManifestAndTemplate(
    docsFolder, versionedDocsFolder, docsManifest, taskApiVersion,
    templateFolder);
