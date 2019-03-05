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

// Get package.json of union package
const unionPackage = JSON.parse(fs.readFileSync(
    'node_modules/@tensorflow/tfjs/package.json', {encoding: 'utf8'}));
const unionPackageVersion = commander.local ? 'local' : unionPackage.version;

// Get the version strings from the libray
const coreVersion = `${unionPackage.dependencies['@tensorflow/tfjs-core']}`;
const coreTag = `v${coreVersion}`;
const layersVersion = `${unionPackage.dependencies['@tensorflow/tfjs-layers']}`;
const layersTag = `v${layersVersion}`;
const converterVersion =
    `${unionPackage.dependencies['@tensorflow/tfjs-converter']}`;
const converterTag = `v${converterVersion}`;
const dataVersion = `${unionPackage.dependencies['@tensorflow/tfjs-data']}`;
const dataTag = `v${dataVersion}`;

const docsFolder = `source/_data/api`;
const versionedDocsFolder = `${docsFolder}/${unionPackageVersion}`

console.log('Versions\n', {
  'Union': unionPackageVersion,
  'core': coreVersion,
  'layers': layersVersion,
  'converter': converterVersion,
  'data': dataVersion,
});

const libs = [
  {
    repo: 'tfjs-core',
    github: `https://github.com/tensorflow/tfjs-core/blob/${coreTag}`,
    version: coreVersion,
    outputFolder: versionedDocsFolder
  },
  {
    repo: 'tfjs-layers',
    github: `https://github.com/tensorflow/tfjs-layers/blob/${layersTag}`,
    version: layersVersion,
    outputFolder: versionedDocsFolder
  },
  {
    repo: 'tfjs-converter',
    github: `https://github.com/tensorflow/tfjs-converter/blob/${converterTag}`,
    version: converterVersion,
    outputFolder: versionedDocsFolder
  },
  {
    repo: 'tfjs-data',
    github: `https://github.com/tensorflow/tfjs-data/blob/${dataTag}`,
    version: dataVersion,
    outputFolder: versionedDocsFolder
  }
];

console.log(`********* Generating Docs *********`);
const outputPaths = generateDocs(libs);

console.log(`********* Merging docs *********`);
const bundlePath = commander.bundle && path.resolve(commander.bundle) ||
    path.resolve('node_modules/@tensorflow/tfjs/dist/tf.min.js');
mergeDocs(docsFolder, versionedDocsFolder, outputPaths, bundlePath);

console.log(`********* Writing Manifest & Template *********`);
const docsManifest = {
  tfjsVersion: unionPackageVersion,
  coreVersion: coreTag,
  layersVersion: layersTag,
  converterVersion: converterTag,
  dataVersion: dataTag,
};

const templateFolder = `source/api`;
writeManifestAndTemplate(
    docsFolder, versionedDocsFolder, docsManifest, unionPackageVersion,
    templateFolder);

// At this point a website build should be able to produce an api docs page
