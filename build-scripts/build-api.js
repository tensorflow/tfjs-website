
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const commander = require('commander');
const mkdirp = require('mkdirp');
const cmp = require('semver-compare');

//
// Helper functions
//

// This primarily exists to support github urls.
function getVersion(depString) {
  return depString.match(/([\d.]+)$/)[0];
}

function bailOnFail(exitCode, msg) {
  if (exitCode !== 0) {
    console.log(`${msg || 'Error building docs json'}`);
    process.exit(1);
  }
}

function sh(cmd, errMsg) {
  const ret = shell.exec(cmd);
  bailOnFail(ret.code, errMsg);
}

//
// Script Start
//

// Get command line params
commander.option('--local', 'use a local build').parse(process.argv);

// Get package.json of union package
const unionPackage =
    JSON.parse(fs.readFileSync('node_modules/@tensorflow/tfjs/package.json'));
const unionPackageVersion =
    commander.local ? 'local' : getVersion(unionPackage.version);

// Get the version strings from the libray
const coreVersion =
    `v${getVersion(unionPackage.dependencies['@tensorflow/tfjs-core'])}`;
const layersVersion =
    `v${getVersion(unionPackage.dependencies['@tensorflow/tfjs-layers'])}`;

const docGenScript = 'build-scripts/doc-gen/make-api.ts';

const libs = [
  {
    repo: 'tfjs-core',
    github: `https://github.com/tensorflow/tfjs-core/blob/${coreVersion}`,
    tag: coreVersion
  },
  {
    repo: 'tfjs-layers',
    github: `https://github.com/tensorflow/tfjs-layers/blob/${layersVersion}`,
    tag: layersVersion
  }
];

// Store the paths to the generate docs for each component.
const outputPaths = [];

libs.forEach(lib => {
  const outputPath =
      path.resolve(`source/_data/api/${unionPackageVersion}/${lib.repo}.json`);

  const opts = {
    input: path.resolve(`libs/${lib.repo}/src/index.ts`),
    pkg: path.resolve(`libs/${lib.repo}/package.json`),
    src: path.resolve(`libs/${lib.repo}/src/`),
    repo: path.resolve(`libs/${lib.repo}/`),
    github: lib.github,
    out: outputPath,
  }

  const docGenCommand = `ts-node ${docGenScript} --in ${opts.input} --package ${
      opts.pkg} --src ${opts.src} --github ${opts.github} --out ${
      opts.out} --repo ${opts.repo}`;

  // Prep the component. If "local" has been passed in then we do nothing
  // to what is in libs. Else we want to check out a tag that correspond to
  // to the version specified the component.
  if (!commander.local) {
    const checkoutCommand = `cd libs/${
        lib.repo} && git fetch --tags --force && git checkout ${lib.tag}`;
    sh(checkoutCommand, `Error checkout out ${lib.tag} for ${lib.repo}`);
  }

  console.log(`********* Generating docs for ${lib.repo} *********`);

  const buildCommand =
      `cd libs/${lib.repo} && yarn && cd ../.. && ${docGenCommand}`;

  sh(buildCommand, `Error building docs for ${lib.repo}`);

  outputPaths.push(outputPath);
});


console.log(`********* Merging docs *********`);


const mergeScript = 'build-scripts/doc-gen/merge-api.ts';
const mergeOutput = `source/_data/api/${unionPackageVersion}/docs.json`;
const skeletonPath = `source/_data/api/${unionPackageVersion}/skeleton.json`;

// Copy master skeleton.json into version dir
fs.copyFileSync('source/_data/api/skeleton.json', skeletonPath);

// Bundle path will be included on every page of the site.
const bundlePath = commander.bundle && path.resolve(commander.bundle) ||
    path.resolve('node_modules/@tensorflow/tfjs/dist/tf.min.js');
fs.copyFileSync(bundlePath, 'themes/dljs/source/js/vendor/tf.min.js');

// Merge the docs for each repo.
const mergeResult = shell.exec(
    `ts-node ${mergeScript} --out ${mergeOutput} --skeleton ${skeletonPath} \
    ${outputPaths.join(' ')}`);
bailOnFail(mergeResult.code, 'Error merging doc JSONs.');

// Write docs manifest.
const docsManifest = {
  tfjsVersion: unionPackageVersion,
  coreVersion,
  layersVersion,
};

fs.writeFileSync(
    `source/_data/api/${unionPackageVersion}/docs_manifest.json`,
    JSON.stringify(docsManifest, null, 2));

// Load api docs manifest
// If the docs version we just generated is not present, generate a new
// hexo page for that version and add it to the versions.
const apiManifestPath = 'source/_data/api/api_manifest.json';
const apiManifest = JSON.parse(fs.readFileSync(apiManifestPath));

if (!apiManifest.versions.includes(unionPackageVersion)) {
  // Do not reformat the string below. It is yaml 'front-matter' format
  const pageTemplate = `---
title: ${unionPackageVersion}
layout: api
---
\n
`;

  mkdirp.sync(`source/api/${unionPackageVersion}`);
  const newApiPagePath = `source/api/${unionPackageVersion}/index.md`;
  fs.writeFileSync(newApiPagePath, pageTemplate);

  // Note we do not add 'local' to the api manifest, this prevents it from
  // showing up in the dropdown menu.
  if (unionPackageVersion !== 'local') {
    apiManifest.versions.unshift(unionPackageVersion);
    apiManifest.versions.sort(cmp).reverse();
    fs.writeFileSync(apiManifestPath, JSON.stringify(apiManifest, null, 2));

    // Override 'latest'. Do not reformat the string below
    const latestPageTemplate = `---
title: ${apiManifest.versions[0]}
layout: api
---
\n
`;

    mkdirp.sync(`source/api/latest/`);
    const newApiPagePath = 'source/api/latest/index.md'
    fs.writeFileSync(newApiPagePath, latestPageTemplate);
  }
}

// A this point a website build should be able to produce an api docs page
