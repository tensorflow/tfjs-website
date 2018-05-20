---
title: faq
date: 2018-03-19 17:38:08
bannerText: Frequently Asked Questions
---

## Does TensorFlow.js support Node.js?

Yes! We recently released node.js bindings for TensorFlow. This allows the same JavaScript code to work on both the browser and node.js, while binding to the underlying TensorFlow C implementation in node. You can follow it's development [on GitHub](https://github.com/tensorflow/tfjs-node) or try out our [NPM package](https://www.npmjs.com/package/@tensorflow/tfjs-node)

## Can I import a TensorFlow or Keras model into the browser?

Yes! We have two tutorials for importing TensorFlow models.  One for the [TensorFlow SavedModel](https://github.com/tensorflow/tfjs-converter) format, and one for importing [Keras HDF5 models](../tutorials/import-keras.html).

## Can I export my model from the browser?

Since Version 0.11.1, you can export the topology and weights of `tf.Model`s to, or load them back
from, browser Local Storage and IndexedDB. You can also trigger downloading of `tf.Model`s as
files or load `tf.Model`s from user-selected files in the browser. In addition, `tf.Model`s can be
sent to HTTP servers through `multipart/form-data` requests. See the
[tutorial page](../tutorials/model-save-load.html) for more details.

We are currently working on these additional features for model import/export:
* Exporting and importing models in Node.js
* Exporting `tf.FrozenModel`s (i.e., models converted from TensorFlow `SavedModel`s).

## How does this relate to TensorFlow?

TensorFlow.js has an API similar to the TensorFlow Python API, however it does not support all of the functionality of the TensorFlow Python API. We are working hard to achieve API parity where it makes sense but also strive to provide an idiomatic JS API.

## How does TensorFlow.js performance compare to the Python version?

In our experience, for inference, TensorFlow.js with WebGL is 1.5-2x slower than TensorFlow Python with AVX. For training, we have seen small models train faster in the browser and large models train up to 10-15x slower in the browser, compared to TensorFlow Python with AVX.

Please take a look at [this benchmark](https://github.com/tensorflow/tfjs-layers/blob/master/integration_tests/benchmarks/index.html) to get more detailed performance measurements.

## What is the difference between TensorFlow.js and deeplearn.js?

TensorFlow.js is an ecosystem of JavaScript tools for machine learning that evolved from deeplearn.js. deeplearn.js is now called TensorFlow.js Core. TensorFlow.js also includes a Layers API&mdash;a higher level library for building machine learning models&mdash;as well as tools for automatically porting TensorFlow SavedModels and Keras HDF5 models.

## I still have some questions

Please feel free to look at our [issues tracker](https://github.com/tensorflow/tfjs/issues) and file a bug there. We also have a <a href="https://groups.google.com/a/tensorflow.org/forum/#!forum/tfjs">community mailing list</a> for people to ask questions, get technical help, and share what they are doing with TensorFlow.js! To keep up to date with TensorFlow.js news follow us on <a href="https://twitter.com/tensorflow" target="_blank">twitter</a> or join the <a href="https://groups.google.com/a/tensorflow.org/forum/#!forum/tfjs-announce">announcement only</a> mailing list.

