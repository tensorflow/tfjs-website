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

import * as tf from '@tensorflow/tfjs';
import * as commander from 'commander';
import * as fs from 'fs';

import {Skeleton} from './skeleton';
import * as util from './util';
import {DocHeading, DocSubheading, RepoDocsAndMetadata} from './view';
import {Docs} from './view';

const dl = tf;  // -core and -layers currently use different namespaces in docs
[tf];           // force typescript to not compile away the reference.
[dl];           // force typescript to not compile away the reference.
const TOPLEVEL_NAMESPACE = 'tf';

commander.option('--bundlePath <path>', 'path to the union bundle')
    .parse(process.argv);

const docsForRepos =
    commander.args.map(arg => JSON.parse(fs.readFileSync(arg, 'utf8'))) as
    RepoDocsAndMetadata[];

function extractSnippets(documentation: string): string[] {
  return documentation.match(/```js[\s\S]*?```/g);
}


function runSnippet(heading: string, snippet: string): void {
  // Strip off the jsDoc markers.
  var oldLog = console.log;
  console.log = function(logstr) {};
  const lines = snippet.split('\n');
  lines.shift();
  lines.pop();
  snippet = lines.join('\n');
  const escapedSnippet = snippet.replace(/\n/g, '\\n');
  const snippetAsAsyncFunction =
      `(async function() {\n${snippet}\n})().catch(e => {console.warn('${
          heading}');console.warn("${escapedSnippet}");console.warn(e);});`;

  const wrappingLines = [
    'tf.setBackend(\'cpu\');', 'tf.ENV.engine.startScope();',
    `await eval(${snippetAsAsyncFunction});`, 'tf.ENV.engine.endScope([]);'
  ];
  snippet = wrappingLines.join('\n');

  try {
    eval(snippetAsAsyncFunction);
  } catch (e) {
    console.warn(heading);
    console.warn(snippet);
    console.warn(`Snippet failed ${e}`);
  }
  console.log = oldLog;
}

docsForRepos.forEach(docsForRepo => {
  docsForRepo.docs.headings.forEach(heading => {
    heading.subheadings.forEach(subheading => {
      subheading.symbols.forEach(symbol => {
        const snippets = extractSnippets(symbol.documentation);
        if (snippets != null) {
          snippets.forEach(snippet => {
            runSnippet(
                `${heading.name} - ${subheading.name} - ${symbol.symbolName}`,
                snippet);
          });
        }
      });
    });
  });
});
