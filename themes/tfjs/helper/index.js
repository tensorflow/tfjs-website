/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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

function isApiPage(path) {
  return path.match(/^api/);
};

function isApiMainPage(path) {
  // Note the escaped trailing /
  return path.match(/^api\//);
};

function isApiVisPage(path) {
  return path.match(/^api_vis/);
};

function isApiNodePage(path) {
  return path.match(/^api_node/);
};

function isApiReactNativePage(path) {
  return path.match(/^api_react_native/);
};

// The snippets on these api pages cannot be run in a browser.
function isNonBrowserApiPage(path) {
  return isApiNodePage(path) || isApiReactNativePage(path);
}

module.exports = function(hexo) {
  return {
    toJson: function(obj) {
      return JSON.stringify(obj);
    },

    isApiPage: isApiPage,

    isApiVisPage: isApiVisPage,

    isApiMainPage: isApiMainPage,

    isApiNodePage: isApiNodePage,

    isNonBrowserApiPage: isNonBrowserApiPage,

    getApi: function(siteData, versionString, path) {
      if (isApiVisPage(path)) {
        return siteData[`api_vis/${versionString}/docs`];
      }
      if (isApiNodePage(path)) {
        return siteData[`api_node/${versionString}/docs`];
      }
      if (isApiReactNativePage(path)) {
        return siteData[`api_react_native/${versionString}/docs`];
      }
      return siteData[`api/${versionString}/docs`];
    },

    /*
     * Find a the matching 'api*' part of a path and return it surrounded by / /
     */
    apiRoot: function(path) {
      const match = path.match(/(api\w*\/)/);
      if (match) {
        return '/' + match[0];
      }
      // This technically shouldn't happen but to avoid user seeing an error
      // state we will return the main api path.
      return '/api/';
    },

    titleFor: function(path) {
      if (isApiNodePage(path)) {
        return 'TensorFlow.js Node API';
      } else if (isApiVisPage(path)) {
        return 'TensorFlow.js Vis API';
      } else if (isApiReactNativePage(path)) {
        return 'TensorFlow.js React Native API';
      } else if (isApiPage(path)) {
        return 'TensorFlow.js API';
      }
      return 'TensorFlow.js';
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

    latestVersion: function(prefix) {
      return hexo.locals.toObject().data[`${prefix}/api_manifest`].versions[0];
    },

    latestUnion: function() {
      return hexo.locals.toObject().data['api/api_manifest'].versions[0];
    },

    docVersions: function(path) {
      const hexoLocals = hexo.locals.toObject();
      if (isApiVisPage(path)) {
        return hexoLocals.data['api_vis/api_manifest'].versions;
      }
      if (isApiNodePage(path)) {
        return hexoLocals.data['api_node/api_manifest'].versions;
      }
      if (isApiReactNativePage(path)) {
        return hexoLocals.data['api_react_native/api_manifest'].versions;
      }
      return hexoLocals.data['api/api_manifest'].versions;
    },

    eq(a, b) {
      return a === b;
    },

    concat: function(a, b) {
      return a + b;
    },

    codepenHtml: function() {
      return JSON.stringify(
          `<h1>Try Tensorflow JS right in your browser. Look at the console to see the output.</h1>`);
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
