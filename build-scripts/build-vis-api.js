const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const commander = require('commander');
const mkdirp = require('mkdirp');
const cmp = require('semver-compare');

//
// Helper functions
//

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
const websitePackage = JSON.parse(fs.readFileSync('package.json'));
const visVersion = commander.local ?
    'local' :
    `v${websitePackage.dependencies['@tensorflow/tfjs-vis']}`;


const docGenScript = 'build-scripts/doc-gen/make-api.ts';

const libs = [
  {
    repo: 'tfjs-vis',
    github: `https://github.com/tensorflow/tfjs-vis/blob/${visVersion}`,
    tag: visVersion
  },
];

// Store the paths to the generate docs for each component.
const outputPaths = [];

libs.forEach(lib => {
  const outputPath =
      path.resolve(`source/_data/api_vis/${visVersion}/${lib.repo}.json`);

  const opts = {
    input: path.resolve(`libs/${lib.repo}/src/index.ts`),
    pkg: path.resolve(`libs/${lib.repo}/package.json`),
    src: path.resolve(`libs/${lib.repo}/src/`),
    repo: path.resolve(`libs/${lib.repo}/`),
    github: lib.github,
    out: outputPath,
  }

  const docGenCommand = `ts-node --project tsconfig.json ${docGenScript} ` +
      `--in ${opts.input} --package ${opts.pkg} --src ${opts.src} --github ${
                            opts.github} --out ${opts.out} --repo ${opts.repo}`;

  // Prep the component. If "local" has been passed in then we do nothing
  // to what is in libs. Else we want to check out a tag that correspond to
  // to the version specified the component.
  if (!commander.local) {
    const checkoutCommand = `cd libs/${lib.repo} \
      && git fetch --tags --force \
      && git checkout ${lib.tag}`;
    sh(checkoutCommand, `Error checkout out ${lib.tag} for ${lib.repo}`);
  }

  console.log(`********* Generating docs for ${lib.repo} *********`);

  sh('pwd', `Error pwd`);

  const buildCommand =
      `cd libs/${lib.repo} && yarn && cd ../.. && ${docGenCommand}`;

  console.log('buildcommand  ', buildCommand);

  sh(buildCommand, `Error building docs for ${lib.repo}`);

  outputPaths.push(outputPath);
});

console.log('Output paths', outputPaths);

console.log(`********* Merging docs *********`);


const mergeScript = 'build-scripts/doc-gen/merge-api.ts';
const mergeOutput = `source/_data/api_vis/${visVersion}/docs.json`;
const skeletonPath = `source/_data/api_vis/${visVersion}/skeleton.json`;

// Copy master skeleton.json into version dir
fs.copyFileSync('source/_data/api_vis/skeleton.json', skeletonPath);

// Bundle path will be included on every page of the site.
// TODO INCLUDE THE VIS LIBRARY BUNDLE
// const bundlePath = commander.bundle && path.resolve(commander.bundle) ||
//     path.resolve('node_modules/@tensorflow/tfjs/dist/tf.min.js');
// fs.copyFileSync(bundlePath, 'themes/tfjs/source/js/vendor/tf.min.js');

// Merge the docs for each repo.
const mergeResult = shell.exec(
    `ts-node ${mergeScript} --out ${mergeOutput} --skeleton ${skeletonPath} \
    ${outputPaths.join(' ')}`);
bailOnFail(mergeResult.code, 'Error merging doc JSONs.');

// Write docs manifest.
const docsManifest = {
  tfjsVersion: visVersion,
  visVersion,
};

fs.writeFileSync(
    `source/_data/api_vis/${visVersion}/docs_manifest.json`,
    JSON.stringify(docsManifest, null, 2));

// Load api docs manifest
// If the docs version we just generated is not present, generate a new
// hexo page for that version and add it to the versions.
const apiManifestPath = 'source/_data/api_vis/api_manifest.json';
const apiManifest = JSON.parse(fs.readFileSync(apiManifestPath));

if (!apiManifest.versions.includes(visVersion)) {
  // Do not reformat the string below. It is yaml 'front-matter' format
  const pageTemplate = `---
title: ${visVersion}
layout: api
---
\n
`;

  mkdirp.sync(`source/api_vis/${visVersion}`);
  const newApiPagePath = `source/api_vis/${visVersion}/index.md`;
  fs.writeFileSync(newApiPagePath, pageTemplate);

  // Note we do not add 'local' to the api manifest, this prevents it from
  // showing up in the dropdown menu.
  if (visVersion !== 'local') {
    apiManifest.versions.unshift(visVersion);
    apiManifest.versions.sort(cmp).reverse();
    fs.writeFileSync(apiManifestPath, JSON.stringify(apiManifest, null, 2));

    // Override 'latest'. Do not reformat the string below
    const latestPageTemplate = `---
title: ${apiManifest.versions[0]}
layout: api
---
\n
`;

    mkdirp.sync(`source/api_vis/latest/`);
    const newApiPagePath = 'source/api_vis/latest/index.md'
    fs.writeFileSync(newApiPagePath, latestPageTemplate);
  }
}

// A this point a website build should be able to produce an api docs page
