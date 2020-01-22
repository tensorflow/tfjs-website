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

// Get package.json of website in order to select rn version
const websitePackage =
    JSON.parse(fs.readFileSync('package.json', {encoding: 'utf8'}));
const rnVersion = commander.local ?
    'local' :
    `${websitePackage.dependencies['@tensorflow/tfjs-react-native']}`;
const rnTag = `tfjs-react_native-v${rnVersion}`

// The react native docs only use the docs from one library
const docsFolder = `source/_data/api_react_native`;
const versionedDocsFolder = `${docsFolder}/${rnVersion}`
const libs = [
  {
    packageName: 'tfjs-react-native',
    github:
        `https://github.com/tensorflow/tfjs/tree/${rnTag}/tfjs-react-native`,
    version: rnVersion,
    outputFolder: versionedDocsFolder
  },
];

console.log(`********* Generating Docs *********`);
const outputPaths = generateDocs(libs);

console.log(`********* Merging docs *********`);
// Note: there isn't really a bundle path that makes sense for react native,
// so use union package as a fallback.
const bundlePath = commander.bundle && path.resolve(commander.bundle) ||
    path.resolve('node_modules/@tensorflow/tfjs/dist/tf.min.js');
mergeDocs(docsFolder, versionedDocsFolder, outputPaths, bundlePath, '__BARE__');

console.log(`********* Writing Manifest & Template *********`);
const docsManifest = {
  rnVersion: rnVersion,
};
const templateFolder = `source/api_react_native`;
writeManifestAndTemplate(
    docsFolder, versionedDocsFolder, docsManifest, rnVersion, templateFolder);

// At this point a website build should be able to produce an api docs page
