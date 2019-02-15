import * as commander from 'commander';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as cmp from 'semver-compare';
import * as shell from 'shelljs';

// The information needed to parse a library for symbols and doc comments
export interface LibraryInfo {
  repo: string;     // path to the library within the website folder
  github: string;   // github url for library
  version: string;  // the version to checkout || 'local' to use repo as is.
  outputFolder: string;  // path to output folder for docs
}

export interface Manifest {
  tfjsVersion?: string;
  coreVersion?: string;
  layersVersion?: string;
  converterVersion?: string;
  dataVersion?: string;
  visVersion?: string;
}

/**
 * Parse the libraries and generate the JSON with symbols and docs.
 * @param libs
 */
export function generateDocs(libs: LibraryInfo[]): string[] {
  const docGenScript = 'build-scripts/doc-gen/make-api.ts';

  const outputPaths = [];
  libs.forEach(lib => {
    const outputPath = path.resolve(`${lib.outputFolder}/${lib.repo}.json`);

    const opts = {
      input: path.resolve(`libs/${lib.repo}/src/index.ts`),
      pkg: path.resolve(`libs/${lib.repo}/package.json`),
      src: path.resolve(`libs/${lib.repo}/src/`),
      repo: path.resolve(`libs/${lib.repo}/`),
      github: lib.github,
      out: outputPath,
    }

    const docGenCommand =
        `ts-node --project tsconfig.json ${docGenScript} ` +
        `--in ${opts.input} --package ${opts.pkg} --src ${opts.src} --github ${
            opts.github} --out ${opts.out} --repo ${opts.repo}`;

    // Prep the component. If "local" has been passed in then we do nothing
    // to what is in libs. Else we want to check out a tag that correspond to
    // to the version specified the component.
    if (!commander.local) {
      const checkoutCommand = `cd libs/${lib.repo} \
      && git fetch --tags --force \
      && git checkout v${lib.version}`;
      sh(checkoutCommand, `Error checkout out ${lib.version} for ${lib.repo}`);
    }

    console.log(`********* Generating docs for ${lib.repo} *********`);

    sh('pwd', `Error pwd`);

    const buildCommand =
        `cd libs/${lib.repo} && yarn && cd ../.. && ${docGenCommand}`;

    console.log('buildcommand  ', buildCommand);

    sh(buildCommand, `Error building docs for ${lib.repo}`);

    outputPaths.push(outputPath);
  });
  return outputPaths
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
    bundlePath: string) {
  const mergeScript = 'build-scripts/doc-gen/merge-api.ts';
  const mergeOutput = `${versionedDocsFolder}/docs.json`;
  const skeletonPath = `${versionedDocsFolder}/skeleton.json`;

  // Copy master skeleton.json into version dir
  fs.copyFileSync(`${docsFolder}/skeleton.json`, skeletonPath);

  // Copy requested bundle into vendor folder
  const targetPath =
      path.join('themes/dljs/source/js/vendor', path.basename(bundlePath))
  fs.copyFileSync(bundlePath, targetPath);

  // Merge the docs for each repo.
  const mergeResult = shell.exec(
      `ts-node ${mergeScript} --out ${mergeOutput} --skeleton ${skeletonPath} \
    ${docPaths.join(' ')}`);
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
    docsVersion: string) {
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
    const newApiPagePath = `${versionedDocsFolder}/index.md`;
    writeTemplate(docsVersion, 'api', newApiPagePath)

    // We do not add 'local' to the api manifest, this prevents it from
    // showing up in the dropdown menu.
    if (docsVersion !== 'local') {
      apiManifest.versions.unshift(docsVersion);
      apiManifest.versions.sort(cmp).reverse();
      fs.writeFileSync(apiManifestPath, JSON.stringify(apiManifest, null, 2));


      // Update the template for 'latest'.
      const newApiPagePath = `${docsFolder}/latest/index.md`;
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
