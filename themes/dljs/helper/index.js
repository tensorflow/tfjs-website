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
      return siteData[`api/${versionString}/core-docs`];
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
      console.log('latest version', hexo.locals.cache.data['api/api_manifest'])
      return hexo.locals.cache.data['api/api_manifest'].versions[0];
    }
  };
};
