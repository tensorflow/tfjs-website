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
  console.log = function (...values) {
    let logStrs = [];
    for (let i = 0; i < values.length; i++) {
      const value = values[i];

      let logStr;
      if (value.toString == null) {
        logStr = value;
      } else {
        const toStr = value.toString();

        if (toStr === '[object Object]') {
          logStr = JSON.stringify(value, null, 2);
        } else {
          logStr = toStr;
        }
        logStrs.push(logStr);
      }
    }
    consoleLogElement.innerHTML += logStrs.join(' ') + '\n';
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
    '\n} catch (e) { reportError(e); } })()';

  if (window._tfengine && window._tfengine.startScope) {
    window._tfengine.startScope();
  } else {
    tf.ENV.engine.startScope()
  }

  // this outer try is for errors that prevent the snippet from being parsed.
  try {
    await eval(evalString).catch(function (e) {
      // This catch is for errors within promises within snippets
      reportError(e);
    });
  } catch (e) {
    reportError(e);
  }


  if (window._tfengine && window._tfengine.endScope) {
    window._tfengine.endScope();
  } else {
    tf.ENV.engine.endScope();
  }

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

function isVersionSupported(version, oldVersion) {
  const versionArray = version.split('.');
  const oldVersionArray = oldVersion.split('.');
  for (var i = 0; i < versionArray.length; i++) {
    const a = ~~versionArray[i];
    const b = ~~oldVersionArray[i];
    if (a > b) {
      return true
    };
    if (a < b) {
      return false;
    }
  }
  return true;
}

function genBackendListString(version) {
  const openLiStr = `<li><input type="radio" name='backend' value=`;
  const closeLiStr = `</li>`;
  var genLiStr = function (backendName) {
    return `${openLiStr}"${backendName}">${backendName}${closeLiStr}`;
  }
  var genLiCheckedStr = function (backendName) {
    return `${openLiStr}"${backendName}" checked="checked"/>${backendName}` +
      `${closeLiStr}`;
  }

  // WebGPU is supported since version 4.6.0, WebGL is 2.0.0, Wasm is 1.7.0.
  const firstWebgpuVersion = '4.6.0';
  const firstWebglVersion = '2.0.0';
  const firstWasmVersion = '1.7.0';
  var backendListStr =
    `<button class="snippet-backend-button gg-chevron-down">` +
    `</button><div class="snippet-backend-list"><ul class="snippet-ul">`;
  var backendName;
  if (isVersionSupported(version, firstWebgpuVersion)) {
    backendName = 'webgpu';
    backendListStr += `${genLiCheckedStr(backendName)}` +
      `${genLiStr('webgl')}${genLiStr('wasm')}${genLiStr('cpu')}`;
  } else if (isVersionSupported(version, firstWebglVersion)) {
    backendName = 'webgl';
    backendListStr += `${genLiCheckedStr(backendName)}` +
      `${genLiStr('wasm')}${genLiStr('cpu')}`;
  } else if (isVersionSupported(version, firstWasmVersion)) {
    backendName = 'wasm';
    backendListStr += `${genLiCheckedStr(backendName)}${genLiStr('cpu')}`;
  } else {
    backendName = 'cpu';
    backendListStr += `${genLiCheckedStr(backendName)}`;
  }
  backendListStr += `</ul></div>`;
  return [backendName, backendListStr];
}

function initCodeBlocks(selector) {
  // Find all the code blocks.
  var jsBlocks =
    Array.prototype.slice.call(document.querySelectorAll(selector));
  const version =
    document.querySelector('.mdc-select__selected-text').innerText;
  const [backendName, backendListStr] = genBackendListString(version);
  tf.setBackend(backendName);

  jsBlocks.forEach(function (block) {
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

    const consoleBackendSelectorElement = document.createElement('div');
    consoleBackendSelectorElement.innerText = 'webgpu';
    consoleBackendSelectorElement.className = 'snippet-backend-dropdown';
    consoleBackendSelectorElement.innerHTML = backendListStr;

    consoleElement.appendChild(consoleLogElement);
    consoleElement.appendChild(consoleEditElement);
    consoleElement.appendChild(consoleRunElement);
    consoleElement.appendChild(consoleBackendSelectorElement);
    block.parentElement.insertAdjacentElement('afterend', consoleElement);

    const backendDropdown =
      consoleElement.querySelector('.snippet-backend-dropdown');
    backendDropdown.querySelector('.snippet-backend-button.gg-chevron-down')
      .onclick = function (evt) {
        const lastBackendList = window.backendListGlobal;
        window.backendListGlobal =
          backendDropdown.querySelector('.snippet-backend-list');
        // If there is any dropdown list open, close it first.
        if (lastBackendList &&
            !lastBackendList.isSameNode(window.backendListGlobal)) {
          if (lastBackendList.classList.contains('snippet-show')) {
            lastBackendList.classList.remove('snippet-show');
          }
        }

        // Close or show current dropdown list.
        if (window.backendListGlobal.classList.contains('snippet-show')) {
          window.backendListGlobal.classList.remove('snippet-show');
          window.backendListGlobal = null;
          setBackend();
        } else {
          const backendButtons =
            window.backendListGlobal.querySelectorAll('input[name="backend"]');
          for (const backendButton of backendButtons) {
            if (backendButton.value === tf.getBackend()) {
              backendButton.checked = true;
              break;
            }
          }
          window.backendListGlobal.classList.add('snippet-show');
        }
      };

    consoleRunElement.addEventListener('click', async function () {
      var consoleLogElement =
        this.parentElement.querySelector('.snippet-console-log');

      var snippetText;
      if (block.codeMirror) {
        snippetText = block.codeMirror.getValue();
      } else {
        snippetText = this.parentElement.previousElementSibling.innerText;
      }

      if (tf == null || tf.ready == null) {
        throw new Error('Failed to load TFJS.');
      }
      await tf.ready();

      executeCodeSnippet(consoleLogElement, snippetText);
    });

    consoleEditElement.addEventListener('click', function () {
      makeEditable(block);
      this.disabled = true;
    });
  });

  function setBackend() {
    const backendButtons = document.querySelectorAll('input[name="backend"]');
    for (const backendButton of backendButtons) {
      if (backendButton.checked) {
        tf.setBackend(backendButton.value);
        return;
      }
    }
  }

  window.onclick = function (event) {
    // Close the dropdown list if the user clicks outside of it.
    if (!event.target.matches('.snippet-backend-button')) {
      if (window.backendListGlobal &&
          window.backendListGlobal.classList.contains('snippet-show')) {
        window.backendListGlobal.classList.remove('snippet-show');
        setBackend();
      }
    }
  }
}
