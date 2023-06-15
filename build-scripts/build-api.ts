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
const commander = require('commander');
import * as fs from 'fs';
import * as path from 'path';

import {generateDocs, mergeDocs, writeManifestAndTemplate} from './build_api_helpers';

//
// Script Start
//
// Get command line params
commander.option('--local', 'use a local build').parse(process.argv);
const options = commander.opts();

// Get package.json of union package
const unionPackage = JSON.parse(fs.readFileSync(
    'node_modules/@tensorflow/tfjs/package.json', {encoding: 'utf8'}));
const tfjsVersion = commander.local ? 'local' : unionPackage.version;
const tfjsTag = `tfjs-v${tfjsVersion}`;

const docsFolder = `source/_data/api`;
const versionedDocsFolder = `${docsFolder}/${tfjsVersion}`

console.log('Versions\n', {'tfjs': tfjsVersion});

const libs = [
  {
    packageName: 'tfjs-core',
    github: `https://github.com/tensorflow/tfjs/tree/${tfjsTag}/tfjs-core`,
    version: tfjsVersion,
    outputFolder: versionedDocsFolder
  },
  {
    packageName: 'tfjs-layers',
    github: `https://github.com/tensorflow/tfjs/tree/${tfjsTag}/tfjs-layers`,
    version: tfjsVersion,
    outputFolder: versionedDocsFolder
  },
  {
    packageName: 'tfjs-converter',
    github: `https://github.com/tensorflow/tfjs/tree/` +
        `${tfjsTag}/tfjs-converter`,
    version: tfjsVersion,
    outputFolder: versionedDocsFolder
  },
  {
    packageName: 'tfjs-data',
    github: `https://github.com/tensorflow/tfjs/tree/${tfjsTag}/tfjs-data`,
    version: tfjsVersion,
    outputFolder: versionedDocsFolder
  }
];

const flagFiles = [
  {
    packageName: 'tfjs-backend-webgl',
    fileName: 'src/flags_webgl.ts',
    github: `https://github.com/tensorflow/tfjs/tree/${tfjsTag}/tfjs-backend-webgl`,
    version: tfjsVersion,
    outputFolder: versionedDocsFolder
  },
  {
    packageName: 'tfjs-backend-webgpu',
    fileName: 'src/flags_webgpu.ts',
    github: `https://github.com/tensorflow/tfjs/tree/${tfjsTag}/tfjs-backend-webgpu`,
    version: tfjsVersion,
    outputFolder: versionedDocsFolder
  },
];

console.log(`********* Generating Docs *********`);
const outputPaths = [...generateDocs(libs, false, false), ...generateDocs(flagFiles, true, true)];

console.log(`********* Merging docs *********`);
const bundlePath = commander.bundle && path.resolve(commander.bundle) ||
    path.resolve('node_modules/@tensorflow/tfjs/dist/tf.min.js');
mergeDocs(docsFolder, versionedDocsFolder, outputPaths, bundlePath);

console.log(`********* Writing Manifest & Template *********`);
const docsManifest = {
  tfjsVersion: tfjsVersion
};

const templateFolder = `source/api`;
writeManifestAndTemplate(
    docsFolder, versionedDocsFolder, docsManifest, tfjsVersion, templateFolder);

// At this point a website build should be able to produce an api docs page
