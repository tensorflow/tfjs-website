async function executeCodeSnippet(consoleLogElement, codeSnippet) {
  consoleLogElement.innerText = '';
  var oldLog = console.log;
  console.log = function(logStr) {
    consoleLogElement.innerHTML += logStr + '\n';
  };

  async function runSnippet() {
    try {
      eval(codeSnippet);
    } catch (e) {
      var errorMessage = '\n<div class="snippet-error"><em>An error occured';
      if (e.lineNumber !== undefined) {
        errorMessage += ' on line: ' + e.lineNumber + '</em>';
      } else {
        errorMessage += '</em>'
      }
      errorMessage += '<br/>';
      errorMessage += '<div class="snippet-error-msg">' + e.message + '</div>';
      errorMessage += '</div>';

      console.log(errorMessage);
    }
  };

  tf.ENV.engine.startScope();
  await runSnippet();
  tf.ENV.engine.endScope();

  console.log = oldLog;
};

function makeEditable(codeBlock) {
  var parent = codeBlock.parentElement;
  var codeText = codeBlock.innerText;

  parent.innerHTML = '';
  var myCodeMirror = CodeMirror(parent, {
    value: codeText,
    theme: 'railscasts',
    mode: 'javascript',
    tabSize: 2,
    indentUnit: 2,
    viewportMargin: Infinity,
  });

  codeBlock.codeMirror = myCodeMirror;
}

function initCodeBlocks(selector) {
  // Find all the code blocks.
  var jsBlocks =
      Array.prototype.slice.call(document.querySelectorAll(selector));

  jsBlocks.forEach(function(block) {
    var consoleElement = document.createElement('div');
    consoleElement.className = 'snippet-console';

    var consoleRunElement = document.createElement('button');
    consoleRunElement.innerText = 'Run';
    consoleRunElement.className = 'snippet-run-button';

    var consoleEditElement = document.createElement('button');
    consoleEditElement.innerText = 'Edit';
    consoleEditElement.className = 'snippet-edit-button';

    var consoleLogElement = document.createElement('div');
    consoleLogElement.className = 'snippet-console-log';

    consoleElement.appendChild(consoleLogElement);
    consoleElement.appendChild(consoleEditElement);
    consoleElement.appendChild(consoleRunElement);

    block.parentElement.insertAdjacentElement('afterend', consoleElement);

    consoleRunElement.addEventListener('click', function() {
      var consoleLogElement =
          this.parentElement.querySelector('.snippet-console-log');

      var snippetText;
      if (block.codeMirror) {
        snippetText = block.codeMirror.getValue();
      } else {
        snippetText = this.parentElement.previousElementSibling.innerText;
      }

      executeCodeSnippet(consoleLogElement, snippetText);
    });

    consoleEditElement.addEventListener('click', function() {
      makeEditable(block);
      this.disabled = true;
    });
  });
}
