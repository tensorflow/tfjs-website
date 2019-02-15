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

function isApiVisPage(path) {
  return path.match(/^api_vis/);
};

module.exports = function(hexo) {
  return {
    toJson: function(obj) {
      return JSON.stringify(obj);
    },

    isApiPage: function(path) {
      return path.match(/^api/);
    },

    isApiVisPage: isApiVisPage,

    getApi: function(siteData, versionString, path) {
      if (isApiVisPage(path)) {
        return siteData[`api_vis/${versionString}/docs`];
      }
      return siteData[`api/${versionString}/docs`];
    },

    getVisApi: function(siteData, versionString) {
      console.log('getVisAPI', versionString);
      const ret = siteData[`api_vis/${versionString}/docs`];
      console.log('vis api data', ret);
      return ret;
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
