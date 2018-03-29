document.addEventListener('DOMContentLoaded', function(e) {
  async function executeCodeSnippet(consoleLogElement, codeSnippet) {
    consoleLogElement.innerText = '';
    var oldLog = console.log;
    console.log = function(logStr) {
      consoleLogElement.innerText += logStr + '\n';
    };

    var snippet = `(async function() {${codeSnippet}})();`;

    tf.ENV.engine.startScope();
    await eval(snippet);
    tf.ENV.engine.endScope();

    console.log = oldLog;
  };

  function initCodeBlocks() {
    // Find all the code blocks.
    var jsBlocks = document.querySelectorAll('.language-js, .lang-js');
    for (var i = 0; i < jsBlocks.length; i++) {
      console.log('FOUND CODE BLOCK')
      var block = jsBlocks[i];
      var consoleElement = document.createElement('div');
      consoleElement.className = 'snippet-console';
      var consoleRunElement = document.createElement('button');
      consoleRunElement.innerText = 'Run';
      consoleRunElement.className = 'snippet-run-button';
      var consoleLogElement = document.createElement('div');
      consoleLogElement.className = 'snippet-console-log';
      consoleElement.appendChild(consoleLogElement);
      consoleElement.appendChild(consoleRunElement);
      block.parentElement.insertAdjacentElement('afterend', consoleElement);
      consoleRunElement.addEventListener('click', function() {
        var consoleLogElement =
            this.parentElement.querySelector('.snippet-console-log');
        var snippetText = this.parentElement.previousElementSibling.innerText;
        executeCodeSnippet(consoleLogElement, snippetText);
      });
    }
  }
  console.log('INIT CODE BLOCKS')
  initCodeBlocks();
});
