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
    path.resolve('node_modules/@tensorflow/tfjs-vis/dist/tfvis.umd.min.js');
mergeDocs(docsFolder, versionedDocsFolder, outputPaths, bundlePath);

console.log(`********* Writing Manifest & Template *********`);
const docsManifest = {
  tfjsVersion: visVersion,
  visVersion,
};
writeManifestAndTemplate(
    docsFolder, versionedDocsFolder, docsManifest, visVersion);



// A this point a website build should be able to produce an api docs page
