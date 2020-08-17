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
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as cmp from 'semver-compare';
import * as shell from 'shelljs';

// The information needed to parse a library for symbols and doc comments
export interface LibraryInfo {
  packageName: string;  // path to the library within the website folder
  github: string;       // github url for library
  version: string;      // the version to checkout || 'local' to use repo as is.
  outputFolder: string;  // path to output folder for docs
}

export interface Manifest {
  tfjsVersion?: string;
  visVersion?: string;
  rnVersion?: string;
}

/**
 * Parse the libraries and generate the JSON with symbols and docs.
 * @param libs
 */
export function generateDocs(libs: LibraryInfo[]): string[] {
  const docGenScript = 'build-scripts/doc-gen/make-api.ts';

  const outputPaths = [];
  libs.forEach(lib => {
    const outputPath =
        path.resolve(`${lib.outputFolder}/${lib.packageName}.json`);

    const opts = {
      input: path.resolve(`libs/tfjs/${lib.packageName}/src/index.ts`),
      pkg: path.resolve(`libs/tfjs/${lib.packageName}/package.json`),
      src: path.resolve(`libs/tfjs/${lib.packageName}/src/`),
      repo: path.resolve(`libs/tfjs/${lib.packageName}/`),
      github: lib.github,
      out: outputPath,
    };

    const docGenCommand =
        `ts-node --project tsconfig.json ${docGenScript} ` +
        `--in ${opts.input} --package ${opts.pkg} --src ${opts.src} --github ${
            opts.github} --out ${opts.out} --repo ${opts.repo}`;

    // Prep the component. If "local" has been passed in then we do nothing
    // to what is in libs. Else we want to check out a tag that correspond to
    // to the version specified the component.
    if (!commander.local) {
      const identifier = (lib.packageName !== 'tfjs-vis' && lib.packageName !== 'tfjs-react-native') ? 'tfjs' : lib.packageName;
      const checkoutCommand = `cd libs/tfjs \
      && git fetch --tags --force \
      && git checkout ${identifier}-v${lib.version}`;
      sh(checkoutCommand,
         `Error checkout out ${lib.version} for ${lib.packageName}`);
    }

    console.log(`********* Generating docs for ${lib.packageName} *********`);

    sh('pwd', `Error pwd`);

    const buildCommand =
        `cd libs/tfjs/${lib.packageName} && yarn install --frozen-lockfile` +
        ` && cd ../../.. && ${docGenCommand}`;

    console.log('buildcommand  ', buildCommand);

    sh(buildCommand, `Error building docs for ${lib.packageName}`);

    outputPaths.push(outputPath);
  });
  return outputPaths;
}

/**
 * Merge docs for separate libraries into one and link symbols.
 *
 * @param docsFolder
 * @param versionedDocsFolder
 * @param docPaths
 */
export function mergeDocs(
    docsFolder: string, versionedDocsFolder: string, docPaths: string[],
    bundlePath: string, toplevelNamespace = 'tf') {
  const mergeScript = 'build-scripts/doc-gen/merge-api.ts';
  const mergeOutput = `${versionedDocsFolder}/docs.json`;
  const skeletonPath = `${versionedDocsFolder}/skeleton.json`;

  // Copy master skeleton.json into version dir
  fs.copyFileSync(`${docsFolder}/skeleton.json`, skeletonPath);

  // Copy requested bundle into vendor folder
  const targetPath =
      path.join('themes/tfjs/source/js/vendor', path.basename(bundlePath))
  fs.copyFileSync(bundlePath, targetPath);

  // Merge the docs for each repo.
  const mergeResult = shell.exec(
      `ts-node ${mergeScript} --out ${mergeOutput} --skeleton ${skeletonPath} \
    --toplevel ${toplevelNamespace} ${docPaths.join(' ')}`);
  bailOnFail(mergeResult.code, 'Error merging doc JSONs.');
}

/**
 * Write out updated manifests and create new templates if necessary.
 *
 * @param docsFolder
 * @param versionedDocsFolder
 * @param manifest
 * @param docsVersion
 */
export function writeManifestAndTemplate(
    docsFolder: string, versionedDocsFolder: string, manifest: Manifest,
    docsVersion: string, templateFolder: string) {
  // Write docs manifest.
  fs.writeFileSync(
      `${versionedDocsFolder}/docs_manifest.json`,
      JSON.stringify(manifest, null, 2));

  // Load api docs manifest
  // If the docs version we just generated is not present, generate a new
  // hexo page for that version and add it to the versions.
  const apiManifestPath = `${docsFolder}/api_manifest.json`;
  const apiManifest =
      JSON.parse(fs.readFileSync(apiManifestPath, {encoding: 'utf8'}));

  if (!apiManifest.versions.includes(docsVersion)) {
    const newApiPagePath = `${templateFolder}/${docsVersion}/index.md`;
    console.log(
        'writeTemplate', docsVersion, newApiPagePath, docsFolder,
        versionedDocsFolder)
    writeTemplate(docsVersion, 'api', newApiPagePath)

    // We do not add 'local' to the api manifest, this prevents it from
    // showing up in the dropdown menu.
    if (docsVersion !== 'local') {
      apiManifest.versions.unshift(docsVersion);
      apiManifest.versions.sort(cmp).reverse();
      fs.writeFileSync(apiManifestPath, JSON.stringify(apiManifest, null, 2));


      // Update the template for 'latest'.
      const newApiPagePath = `${templateFolder}/latest/index.md`;
      writeTemplate(apiManifest.versions[0], 'api', newApiPagePath);
    }
  }
}

function writeTemplate(title: string, layout: string, filepath: string) {
  // Do not reformat the string below. It is yaml 'front-matter' format
  const pageTemplate = `---\ntitle: ${title}\nlayout: ${layout}\n---\n`;
  mkdirp.sync(path.dirname(filepath));
  fs.writeFileSync(filepath, pageTemplate);
}

function bailOnFail(exitCode: number, msg: string) {
  if (exitCode !== 0) {
    console.log(`${msg || 'Error building docs json'}`);
    process.exit(1);
  }
}

/**
 * Run a shell command and exit the program if it fails.
 * @param cmd
 * @param errMsg
 */
function sh(cmd: string, errMsg: string) {
  const ret = shell.exec(cmd);
  bailOnFail(ret.code, errMsg);
}
