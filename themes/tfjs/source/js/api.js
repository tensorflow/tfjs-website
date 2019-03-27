document.addEventListener('DOMContentLoaded', function(e) {
  // Set up version selector
  var select = new mdc.select.MDCSelect(document.querySelector('.mdc-select'));
  select.listen('MDCSelect:change', () => {
    var link = select.selectedOptions[0].getAttribute('data-link');
    window.location.href = link;
  });

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
    var symbol;
    var sTop;

    for (var i = 0; i < refSymbols.length; i++) {
      symbol = refSymbols[i];
      sTop = symbol.offsetTop;
      if (sTop >= top) {
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

  // Initialize runnable code snippets
  initCodeBlocks('.language-js');
});
