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

module.exports = function(hexo) {
  return {
    toJson: function(obj) {
      return JSON.stringify(obj);
    },

    isApiPage: isApiPage,

    isApiVisPage: isApiVisPage,

    isApiMainPage: isApiMainPage,

    isApiNodePage: isApiNodePage,

    getApi: function(siteData, versionString, path) {
      if (isApiVisPage(path)) {
        return siteData[`api_vis/${versionString}/docs`];
      }
      if (isApiNodePage(path)) {
        return siteData[`api_node/${versionString}/docs`];
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
      return hexo.locals.cache.data[`${prefix}/api_manifest`].versions[0];
    },

    latestUnion: function() {
      return hexo.locals.cache.data['api/api_manifest'].versions[0];
    },

    docVersions: function(path) {
      if (isApiVisPage(path)) {
        return hexo.locals.cache.data['api_vis/api_manifest'].versions;
      }
      if (isApiNodePage(path)) {
        return hexo.locals.cache.data['api_node/api_manifest'].versions;
      }
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
