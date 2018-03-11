
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const commander = require('commander');
const mkdirp = require('mkdirp');

// Get package.json of union package
// const unionPackage =
// JSON.parse(fs.readFileSync('node_modules/tfjs/package.json')); const
// unionPackageVersion = unionPackage.version;
const unionPackageVersion = '0.0.1';

function getVersion(depString) {
  // This primarily exists to support github urls pre-release.
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

// Get command line params
commander.option('--in [path]', 'main source entry')
    .option('--package [path]', 'Package.json path')
    .option('--src [path]', 'Path to src folder of repo')
    .option('--repo [path]', 'Path to repo')
    .option('--bundle  [path]', 'JS Bundle Path')
    .option('--github [url]', 'Github repository URL')
    .option('--out [path]', 'Output Path')
    .option('--branch [branch name]', 'branch to build from')
    .parse(process.argv);

// Get the version strings from the libray
// const coreVersion = `v${getVersion(unionPackage.dependencies['tfjs-core'])}`;
// const layersVersion =
// `v${getVersion(unionPackage.dependencies['tfjs-layers'])}`;

// const coreVersion = `v${'0.5.0'}`;
const coreVersion = `master`;
// const layersVersion = `v${'0.5.0'}`;

const docGenScript = 'build-scripts/doc-gen/make-api.ts';

const pr = path.resolve;

// TODO(nsthorat): Remove 'github' once deeplearn.js moves into TensorFlow.
const libs = [
  {repo: 'tfjs-core', github: 'https://github.com/PAIR-code/deeplearnjs'},
  {repo: 'tfjs-layers', github: 'https://github.com/tensorflow/tfjs-layers'}
];
const outputPaths = [];
libs.forEach(lib => {
  const outputPath =
      path.resolve(`source/_data/api/${unionPackageVersion}/${lib.repo}.json`);
  const opts = {
    input: (commander.in && pr(commander.in)) ||
        path.resolve(`libs/${lib.repo}/src/index.ts`),
    pkg: (commander.package && pr(commander.package)) ||
        path.resolve(`libs/${lib.repo}/package.json`),
    src: (commander.src && pr(commander.src)) ||
        path.resolve(`libs/${lib.repo}/src/`),
    repo: (commander.repo && pr(commander.repo)) ||
        path.resolve(`libs/${lib.repo}/`),
    github: lib.github,
    out: outputPath,
  }

  const docGenCommand = `ts-node ${docGenScript} --in ${opts.input} --package ${
      opts.pkg} --src ${opts.src} --bundle ${opts.bundle} --github ${
      opts.github} --out ${opts.out} --repo ${opts.repo}`;

  console.log(`********* Generating docs for ${lib.repo} *********`);
  // TODO: Swap this version with the version from the union package.
  const version = 'master';
  const coreBuild = shell.exec(
      `cd libs/${lib.repo} && ` +
      `git checkout ${version} && yarn && cd ../.. && ${docGenCommand}`);
  bailOnFail(coreBuild.code, `Error building docs for ${lib.repo}`);
  outputPaths.push(outputPath);
});

console.log(`********* Merging docs *********`);

const mergeScript = 'build-scripts/doc-gen/merge-api.ts';
const mergeOutput = `source/_data/api/${unionPackageVersion}/docs.json`;
const skeletonPath = `source/_data/api/${unionPackageVersion}/skeleton.json`;
// TODO: Use the union package.
const bundlePath = commander.bundle && pr(commander.bundle) ||
    path.resolve('libs/tfjs-core/dist/deeplearn.js');
// Merge the docs for each repo.
const mergeResult = shell.exec(
    `ts-node ${mergeScript} --out ${mergeOutput} --skeleton ${skeletonPath} \
    --bundlePath ${bundlePath} ${outputPaths.join(' ')}`);
bailOnFail(mergeResult.code, 'Error merging doc JSONs.');

// Write docs manifest.
const docsManifest = {
  tfjsVersion: unionPackageVersion,
  coreVersion,
  // layersVersion,
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
title: 0.0.1
date: 2018-03-06 23:17:41
layout: api
---
\n
`;

  mkdirp.sync(`source/api/${unionPackageVersion}`);
  const newApiPagePath = `source/api/${unionPackageVersion}/index.md`
  fs.writeFileSync(newApiPagePath, pageTemplate);

  apiManifest.versions.unshift(unionPackageVersion);
  // TODO semver sort.

  fs.writeFileSync(apiManifestPath, JSON.stringify(apiManifest, null, 2));
}

// A this point a website build should be able to produce an api docs page
