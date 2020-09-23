/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
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

const MarkdownIt = require('markdown-it');

const hljs = require('highlight.js');

const md = new MarkdownIt({
  highlight(str, lang) {
    if (lang === 'js' && hljs.getLanguage(lang)) {
      const highlighted = hljs.highlight(lang, str).value;
      return '<pre class="hljs"><code class="hljs language-js">' + highlighted +
          '</code></pre>\n';
    }

    return '';  // use external default escaping
  }
});

module.exports = function(hexo) {
  return {
    toJson: function(obj) {
      return JSON.stringify(obj);
    },

    isApiPage: function(path) {
      return path.match(/^api/);
    },

    getApi: function(siteData, versionString) {
      return siteData[`api/${versionString}/docs`];
    },

    markdown: function(attr) {
      if (attr) {
        return md.render(attr);
      }
    },

    markdownInner: function(attr) {
      if (attr) {
        const asMd = md.render(attr.trim())
                         .replace(/<p>/, '')
                         .replace(/(<\/p>\s*)$/, '');

        return asMd;
      }
    },

    latestVersion: function() {
      return hexo.locals.cache.data['api/api_manifest'].versions[0];
    },

    docVersions: function() {
      return hexo.locals.cache.data['api/api_manifest'].versions;
    },

    eq(a, b) {
      return a === b;
    },

    concat: function(a, b) {
      return a + b;
    },

    codepenHtml: function() {
      return JSON.stringify(
          `<h1>Try Tensorflow JS right in your browser!</h1>`);
    },

    codepenJs: function() {
      return JSON.stringify(`// Define a model for linear regression.
const model = tf.sequential();
model.add(tf.layers.dense({units: 1, inputShape: [1]}));

// Prepare the model for training: Specify the loss and the optimizer.
model.compile({loss: 'meanSquaredError', optimizer: 'sgd'});

// Generate some synthetic data for training.
const xs = tf.tensor2d([1, 2, 3, 4], [4, 1]);
const ys = tf.tensor2d([1, 3, 5, 7], [4, 1]);

// Train the model using the data.
model.fit(xs, ys).then(() => {
  // Use the model to do inference on a data point the model hasn't seen before:
  // Open the browser devtools to see the output
  model.predict(tf.tensor2d([5], [1, 1])).print();
});
      `);
    }
  };
};
