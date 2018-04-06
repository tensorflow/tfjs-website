// There isn't a standard way to get line numbers reliably, we attempt to
// parse out a few formats we have seen.
// Note we do not use e.lineNumber as it is not reliable (especially in the
// context of eval)
function getLineNumber(error) {
  try {
    // firefox
    const firefoxRegex = /eval:(\d+):\d+/;
    if (error.stack.match(firefoxRegex)) {
      const res = error.stack.match(firefoxRegex);
      return parseInt(res[1], 10);
    }

    // chrome
    const chromeRegex = /eval.+:(\d+):\d+/;
    if (error.stack.match(chromeRegex)) {
      const res = error.stack.match(chromeRegex);
      return parseInt(res[1], 10);
    }

  } catch (e) {
    return;
  }

  // We found nothing
  return;
}

async function executeCodeSnippet(consoleLogElement, codeSnippet) {
  consoleLogElement.innerText = '';
  var oldLog = console.log;
  console.log = function(logStr) {
    consoleLogElement.innerHTML += logStr + '\n';
  };

  function reportError(e) {
    var errorMessage = '\n<div class="snippet-error"><em>An error occured';
    var lineNumber = getLineNumber(e);
    if (lineNumber !== undefined) {
      errorMessage += ' on line: ' + lineNumber + '</em>';
    } else {
      errorMessage += '</em>'
    }
    errorMessage += '<br/>';
    errorMessage += '<div class="snippet-error-msg">' + e.message + '</div>';
    errorMessage += '</div>';

    console.log(errorMessage);
  }

  // It is important that codeSnippet and 'try {' be on the same line
  // in order to not modify the line number on an error.
  const evalString = '(async function runner() { try { ' + codeSnippet +
      '} catch (e) { reportError(e); } })()';

  tf.ENV.engine.startScope();

  // this outer try is for errors that prevent the snippet from being parsed.
  try {
    await eval(evalString).catch(function(e) {
      // This catch is for errors within promises within snippets
      reportError(e);
    });
  } catch (e) {
    reportError(e);
  }

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
