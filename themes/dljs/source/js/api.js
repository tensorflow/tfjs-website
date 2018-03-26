document.addEventListener('DOMContentLoaded', function(e) {
  // Set up version selector
  var select = new mdc.select.MDCSelect(document.querySelector('.mdc-select'));
  select.listen('MDCSelect:change', () => {
    var link = select.selectedOptions[0].getAttribute('data-link');
    window.location.href = link;
  });

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
    var jsBlocks = document.querySelectorAll('.language-js');
    for (var i = 0; i < jsBlocks.length; i++) {
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
  initCodeBlocks();


  var isInViewport = function(elem) {
    var bounding = elem.getBoundingClientRect();
    return (
        bounding.top >= 0 && bounding.left >= 0 &&
        bounding.bottom <=
            (window.innerHeight || document.documentElement.clientHeight) &&
        bounding.right <=
            (window.innerWidth || document.documentElement.clientWidth));
  };
  // Find the symbol closest to the top of the page in the reference
  // section and highlight it in the TOC section.
  var refSymbols = document.querySelectorAll('.symbol-link');
  var tocArea = document.querySelector('.toc');
  var lastHighlightedTocElement;
  function updateTocView() {
    var top = window.scrollY;
    var found;
    var tocFound;

    for (var i = 0; i < refSymbols.length; i++) {
      var symbol = refSymbols[i];
      var sTop = symbol.offsetTop;
      if (sTop > top) {
        found = symbol;
        break;
      }
    }

    if (found) {
      tocFound =
          tocArea.querySelector(`[href="#${found.getAttribute('name')}"]`)

      if (tocFound) {
        if (lastHighlightedTocElement) {
          lastHighlightedTocElement.classList.remove('highlighted');
        }
        tocFound.classList.add('highlighted');
        if (!isInViewport(tocFound)) {
          tocFound.scrollIntoView(false);
        }
        lastHighlightedTocElement = tocFound;
      }
    }
  }

  window.addEventListener('scroll', updateTocView);
  window.addEventListener('resize', updateTocView);
});
