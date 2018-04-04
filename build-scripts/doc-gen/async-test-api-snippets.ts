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
import {DocClass, DocHeading, DocSubheading, RepoDocsAndMetadata} from './view';
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
  if (documentation.match(/```javascript[\s\S]*?```/g)) {
    console.warn(`Docs contain tripletick javascript, rather than js`);
    console.warn('Snippet not tested.')
  }
  return documentation.match(/```js[\s\S]*?```/g);
}

const snippetRecord = {
  pass: 0,
  fail: [],
  snippetOutput: {}
};

function updateResults(label: string, snippet: string, err: Error) {
  if (err == null) {
    snippetRecord.pass++;
  } else {
    snippetRecord.fail.push({label, snippet, exception: err});
  }
}

function stripJsDocTags(snippet: string): string {
  const lines = snippet.split('\n');
  lines.shift();
  lines.pop();
  return lines.join('\n');
}

const originalLog = console.log;

async function runSnippet(heading: string, snippet: string): Promise<void> {
  snippetRecord.snippetOutput[heading] = false;

  snippet = stripJsDocTags(snippet);

  try {
    tf.setBackend('cpu');
    tf.ENV.engine.startScope();
    console.log = function(logstr) {
      snippetRecord.snippetOutput[heading] = true;
    };
    try {
      await eval(`(async function() {\n${snippet}\n})();`);
    } catch (e) {
      updateResults(heading, snippet, e);
    }
    tf.ENV.engine.endScope([]);

    updateResults(heading, snippet, null);
  } catch (e) {
    updateResults(heading, snippet, e);
  }
}

const promises: Promise<void>[] = [];

docsForRepos.forEach(docsForRepo => {
  docsForRepo.docs.headings.forEach(heading => {
    heading.subheadings.forEach(subheading => {
      subheading.symbols.forEach((untypedSymbol) => {
        const snippets = extractSnippets(untypedSymbol.documentation);
        if (snippets != null) {
          snippets.forEach((snippet, index) => {
            const label = `${heading.name} - ${subheading.name} - ${
                untypedSymbol.symbolName} - ${index}`;
            promises.push(runSnippet(label, snippet));
          });
        }
        if (untypedSymbol['isClass']) {
          const symbol = untypedSymbol as DocClass;
          symbol.methods.forEach(method => {
            const snippets = extractSnippets(method.documentation);
            if (snippets != null) {
              snippets.forEach((snippet, index) => {
                const label = `${heading.name} - ${subheading.name} - ${
                    untypedSymbol.symbolName} - ${method.symbolName} - ${
                    index}`;
                promises.push(runSnippet(label, snippet));
              });
            }
          });
        }
      });
    });
  });
});

function generateReport() {
  console.log = originalLog;
  const totalSnippets = snippetRecord.fail.length + snippetRecord.pass;
  console.log(`====================================================`);
  console.log(`Ran ${totalSnippets}`);
  if (snippetRecord.fail.length > 0) {
    console.log(`FAILED: ${snippetRecord.fail.length}`);
    snippetRecord.fail.forEach(entry => {
      console.log(`====================================================`);
      console.log(`${entry.label}`);
      console.log(`${entry.exception}`);
      console.log('');
      console.log(`${entry.snippet}`);
    })
  }
  console.log(`+====================================================`);
  for (const key in snippetRecord.snippetOutput) {
    if (!snippetRecord.snippetOutput[key]) {
      console.log(`Failed to generated output ${key}`);
    }
  }
}

Promise.all(promises).then(generateReport);
