---
title: setup
align: center
date: 2018-12-10 10:38:08
bannerText: Getting Set-up with TensorFlow.js
---

{% raw %}

<div class="content">
  <div id="getting-started" class="getting-started">
    <h1>Browser setup</h1>

    <p>
      There are two main ways to get TensorFlow.js in your browser based projects: via
      <a href="https://developer.mozilla.org/en-US/docs/Learn/HTML/Howto/Use_JavaScript_within_a_webpage" target="_blank">
        script tags</a>
      <strong>or</strong> by installing it from
      <a href="https://www.npmjs.com/" target="_blank">NPM</a>
      and using a build tool like
      <a href="https://parceljs.org/" target="_blank">Parcel</a>,
      <a href="https://webpack.js.org/" target="_blank">WebPack</a>, or
      <a href="https://rollupjs.org/guide/en" target="_blank">Rollup</a>.
    </p>

    <p>
      If you are new to web development we recommend you use the script tag approach. If you are more experienced or want to write larger programs it might be worthwhile to explore using build tools.
    </p>

    <h3>via Script Tag</h3>
    <p>Add the following script tag to your main HTML file.</p>

    <div class="gs-code">
      <pre>
        <code class="lang-html">
&lt;script src=&quot;https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@{{latestVersion}}/dist/tf.min.js&quot;&gt; &lt;/script&gt;
      </pre>
    </div>

    <a href="/demos" class="centered-button">
      <button class="mdc-button mdc-button--raised">See our script-tag boilerplate</button>
    </a>


    <h3>via NPM</h3>

    <p>
      Add TensorFlow.js to your project using yarn
      <strong>or</strong> npm.
      <b>Note:</b> This workflow assumes you are using a
      bundler/transpiler
      to convert your code to something the browser understands. See our
      <a href='https://github.com/tensorflow/tfjs-examples' target="_blank">examples</a>
      to see how we use
      <a href="https://parceljs.org/" target="_blank">Parcel</a> to build our code. However you are free to use any
      build tool that you prefer.
    </p>

    <div class="gs-code">
      <pre><code class="lang-shell">yarn add @tensorflow/tfjs</code></pre>
    </div>

    <div class="gs-code">
      <pre><code class="lang-shell">npm install @tensorflow/tfjs</code></pre>
    </div>

    <a href="/demos" class="centered-button">
      <button class="mdc-button mdc-button--raised">See our npm/parcel boilerplate</button>
    </a>

    <h1>Node.js setup</h1>

    <ul>
    <li>
      <strong>Step 1:</strong> Add the tfjs package.
      <div class="gs-code">
        <pre><code class="lang-shell">yarn add @tensorflow/tfjs</code></pre>
      </div>

      <div class="gs-code">
        <pre><code class="lang-shell">npm install @tensorflow/tfjs</code></pre>
      </div>
    </li>
    <li>
      <strong>Optional Step 2:</strong> Install the tensorflow C++ bindings. Step 1 allows you to run tensorflow in pure javascript. This step binds to native libraries for increased perfromance.
      <div class="gs-code">
        <pre><code class="lang-shell">yarn add @tensorflow/tfjs-node</code></pre>
      </div>
      <div class="gs-code">
        <pre><code class="lang-shell">npm install @tensorflow/tfjs-node</code></pre>
      </div>
    </li>
    <li>
      <strong>Optional Step 3:</strong> (Linux Only) If your system has a NVIDIA® GPU with
      <a href="https://www.tensorflow.org/install/install_linux#NVIDIARequirements" target="_blank">CUDA compute
        support</a>, use the GPU package <strong>instead of Step 2</strong> for higher performance:
      <div class="gs-code">
        <pre><code class="lang-shell">yarn add @tensorflow/tfjs-node-gpu</code></pre>
      </div>
      <div class="gs-code">
        <pre><code class="lang-shell">npm install @tensorflow/tfjs-node-gpu</code></pre>
      </div>
    </li>
    </ul>

    <a href="/demos" class="centered-button">
      <button class="mdc-button mdc-button--raised">See our Node.js boilerplate</button>
    </a>

  </div>

</div>
<script>hljs.initHighlightingOnLoad();</script>
{% endraw %}
