const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const commander = require('commander');

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

// Build JSON
const docGenScript = 'scripts/doc-gen/make-api.ts';

const coreOutputPath =
    path.resolve(`source/_data/api/${unionPackageVersion}/core-docs.json`);


const pr = path.resolve;

let opts = {
  input: (commander.in && pr(commander.in)) ||
      path.resolve('libs/tfjs-core/src/index.ts'),
  pkg: (commander.package && pr(commander.package)) ||
      path.resolve('libs/tfjs-core/package.json'),
  src: (commander.src && pr(commander.src)) ||
      path.resolve('libs/tfjs-core/src/'),
  repo:
      (commander.repo && pr(commander.repo)) || path.resolve('libs/tfjs-core/'),
  bundle: (commander.bundle && pr(commander.bundle)) ||
      path.resolve('libs/tfjs-core/dist/deeplearn.js'),
  github: 'https://github.com/PAIR-code/deeplearnjs',
  out: coreOutputPath,
}

const coreDocGenCommand = `ts-node ${docGenScript} --in ${
    opts.input} --package ${opts.pkg} --src ${opts.src} --bundle ${
    opts.bundle} --github ${opts.github} --out ${opts.out} --repo ${opts.repo}`;


const coreBuild = shell.exec(`cd libs/tfjs-core && git checkout ${
    coreVersion} && yarn && cd ../.. && ${coreDocGenCommand}`);
bailOnFail(coreBuild.code, 'Error building core docs');

// const layersOutputPath = path.resolve(
//     `../source/_data/api/${unionPackage.version}/layers-docs.json`);
// const layersBuild = shell.exec(`cd libs/tfjs-layers && git checkout tags/${
//     layersVersion} && yarn && yarn run build-api ${layersOutputPath}`);
// bailOnFail(layersBuild.code, 'Error building layer docs');

// Merge JSON (and add header descriptions.
// const mergeResult = shell.exec(
//     `yarn run merge-docs-json ${coreOutputPath} ${layersOutputPath}`);
// bailOnFail(mergeResult.code, 'Error merging jsons');

// Write docs manifest.
const docsManifest = {
  tfjsVersion: unionPackageVersion,
  coreVersion,
  // layersVersion,
};

fs.writeFileSync(
    `source/_data/api/${unionPackageVersion}/docs_manifest.json`,
    JSON.stringify(docsManifest, null, 2));

// Add to the list of versions
// We will have a file that lists all the build versions in sorted array

// load file, add this version. turn it into a set. turn back to a list. sort


// If the version is new we should create a new hexo page .
// hexo new page api ${unionPackageVersion} --path source/api/

// A this point a website build should be able to produce an api docs page
