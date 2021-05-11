/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import {Skeleton} from './skeleton';
import * as util from './util';
import {DocFunctionParam, DocHeading, DocSubheading, RepoDocsAndMetadata} from './view';
import {Docs} from './view';

let TOPLEVEL_NAMESPACE = 'tf';

commander.option('--out <path>', 'merged output JSON file')
    .option('--skeleton <path>', 'path to the skeleton JSON')
    .option('--toplevel <string>', 'the string for the top level namespace')
    .parse(process.argv);
if (commander.out == null) {
  throw new Error(`No merged output JSON file target specified.`);
}
if (commander.skeleton == null) {
  throw new Error(`No skeleton JSON file specified.`);
}

if (commander.toplevel != null) {
  TOPLEVEL_NAMESPACE = commander.toplevel;
}

// We have a special value if the symbols do not have a top level namespace
if (TOPLEVEL_NAMESPACE === '__BARE__') {
  TOPLEVEL_NAMESPACE = '';
}

const skeleton =
    JSON.parse(fs.readFileSync(commander.skeleton, 'utf8')) as Skeleton;

const docsForRepos =
    commander.args.map(arg => JSON.parse(fs.readFileSync(arg, 'utf8'))) as
    RepoDocsAndMetadata[];

// Copy the skeleton over to merged docs and keep a map of headings /
// subheadings to their entries. From the skeleton, we build up empty merged
// docs, then walk through each library's docs and merge them in.
const mergedDocs: Docs = {
  headings: []
};
const pins: {[heading: string]: {[subheading: string]: string[]}} = {};

// Seed the docs with empty headings and subheadings from the skeleton so we
// control heading / subheading sort order.
skeleton.forEach(skeletonHeading => {
  const description = skeletonHeading.description != null ?
      skeletonHeading.description.join('\n') :
      '';
  const heading:
      DocHeading = {name: skeletonHeading.name, description, subheadings: []};
  if (pins[heading.name] == null) {
    pins[heading.name] = {};
  }

  skeletonHeading.subheadings.forEach(skeletonSubheading => {
    const description = skeletonSubheading.description != null ?
        skeletonSubheading.description.join('\n') :
        '';
    const subheading: DocSubheading = {
      name: skeletonSubheading.name,
      description,
      symbols: []
    };
    heading.subheadings.push(subheading);

    pins[heading.name][subheading.name] =
        skeletonSubheading.pin != null ? skeletonSubheading.pin : [];
  });
  mergedDocs.headings.push(heading);
});

// Collect all the interfaces for all the repos and merge them.
const configInterfaceParamMapMerged:
    {[interfaceName: string]: DocFunctionParam[]} = {};
docsForRepos.forEach(docsForRepo => {
  Object.keys(docsForRepo.configInterfaceParamMap).forEach(key => {
    if (configInterfaceParamMapMerged[key] != null) {
      console.warn(
          `WARNING: ${key} interface found in multiple repos. ` +
          `Using first instantation for config unpacking.`);
    } else {
      configInterfaceParamMapMerged[key] =
          docsForRepo.configInterfaceParamMap[key];
    }
  });
});

// Collected all the types tagged with @docinline to inline.
const inlineTypesMerged: {[typeName: string]: string} = {};
docsForRepos.forEach(docsForRepo => {
  Object.keys(docsForRepo.inlineTypes).forEach(key => {
    if (inlineTypesMerged[key] != null) {
      console.warn(
          `WARNING: ${key} inlined type found in multiple repos. ` +
          `Using first instantation for inlining.`);
    } else {
      inlineTypesMerged[key] = docsForRepo.inlineTypes[key];
    }
  });
});

// Collect all the doc aliases and merge them.
const docTypeAliasesMerged: {[type: string]: string} = {};
docsForRepos.forEach(docsForRepos => {
  Object.keys(docsForRepos.docTypeAliases).forEach(key => {
    if (docTypeAliasesMerged[key] != null) {
      console.warn(
          `WARNING: ${key} doc alias found in multiple repos. ` +
          `Using first instantation for doc aliasing.`);
    } else {
      docTypeAliasesMerged[key] = docsForRepos.docTypeAliases[key];
    }
  });
});

// Merge doc link aliases.
const mergedDocLinkAliases: {[symbolName: string]: string} = {};
docsForRepos.forEach(docsForRepos => {
  Object.keys(docsForRepos.docLinkAliases).forEach(symbolName => {
    if (mergedDocLinkAliases[symbolName] != null) {
      throw new Error(`Found duplicate doc link aliases for ${symbolName}.`);
    }
    mergedDocLinkAliases[symbolName] = docsForRepos.docLinkAliases[symbolName];
  });
});

// Merge the docs for each repo in. Note that this is done in multiplicative
// time. This could be sped up by using hashmaps if this is a bottleneck.
docsForRepos.forEach(docsForRepo => {
  docsForRepo.docs.headings.forEach(heading => {
    heading.subheadings.forEach(subheading => {
      let headingFound = false;
      mergedDocs.headings.forEach(mergedHeading => {
        if (mergedHeading.name != heading.name) {
          return;
        }
        headingFound = true;

        let subheadingFound = false;
        mergedHeading.subheadings.forEach(mergedSubheading => {
          if (mergedSubheading.name != subheading.name) {
            return;
          }
          subheadingFound = true;

          // Merge all of the subheading symbols.
          subheading.symbols.forEach(symbol => {
            mergedSubheading.symbols.push(symbol);
          });
        });
        if (!subheadingFound) {
          mergedHeading.subheadings.push(subheading);
        }
      });
      if (!headingFound) {
        mergedDocs.headings.push(heading);
      }
    });
  });
});

util.sortMethods(mergedDocs, pins);

// Unpack the config params on the merged docs.
util.unpackConfigParams(mergedDocs.headings, configInterfaceParamMapMerged);
// Unpack extra types.
util.unpackExtraTypesInClasses(
    mergedDocs.headings, configInterfaceParamMapMerged);
// Unpack return types.
util.unpackReturnTypes(mergedDocs.headings, configInterfaceParamMapMerged);
// Inline types
util.inlineTypes(mergedDocs.headings, inlineTypesMerged);
// Replace doc aliases
util.replaceDocTypeAliases(mergedDocs.headings, docTypeAliasesMerged);

// Predefine some custom type links.
const symbols: util.SymbolAndUrl[] = [
  {
    symbolName: 'TypedArray',
    referenceName: 'TypedArray',
    url: 'https://developer.mozilla.org/en-US/docs/Web/' +
        'JavaScript/Reference/Global_Objects/TypedArray',
    type: 'class'
  },
  {
    symbolName: 'ImageData',
    referenceName: 'ImageData',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/ImageData',
    type: 'class'
  },
  {
    symbolName: 'HTMLImageElement',
    referenceName: 'HTMLImageElement',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement',
    type: 'class'
  },
  {
    symbolName: 'HTMLCanvasElement',
    referenceName: 'HTMLCanvasElement',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement',
    type: 'class'
  },
  {
    symbolName: 'HTMLVideoElement',
    referenceName: 'HTMLVideoElement',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement',
    type: 'class'
  }
];
util.linkSymbols(mergedDocs, symbols, TOPLEVEL_NAMESPACE, mergedDocLinkAliases);

fs.writeFileSync(commander.out, JSON.stringify(mergedDocs, undefined, 2));

// Compute some statics and render them.
const {headingsCount, subheadingsCount, methodCount} =
    util.computeStatistics(mergedDocs);
console.log(
    `Merged API reference written to ${commander.out}\n` +
    `Total found: \n` +
    `  ${headingsCount} headings\n` +
    `  ${subheadingsCount} subheadings\n` +
    `  ${methodCount} methods`);
