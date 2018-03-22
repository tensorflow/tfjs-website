---
title: faq
date: 2018-03-19 17:38:08
bannerText: Frequently Asked Questions
---

## Does TensorFlow.js support Node.js?

Not yet! However we are actively working on creating node.js bindings to the TensorFlow C API. This will allow the same JavaScript code to work on both the browser and node.js, while binding to the underlying TensorFlow implementation. We can’t provide a firm timeline for when this will be released but it is one of our top priorities.

## Can I import a TensorFlow or Keras model into the browser?

Yes! We have two tutorials for for importing Tensorflow models.  One for the [TensorFlow SavedModel](https://github.com/tensorflow/tfjs-converter) format, and one for importing Keras HDF5 models.

## Can I export my model from the browser?

Not yet, but this is also one of our highest priorities. We are working on a format that will make it easy to load and save models that originated in the browser. Keep an eye on [this issue](https://github.com/tensorflow/tfjs/issues/13) to see when it is done.

## How does Tensorflow.js performance compare to the Python version?

In our experience, for inference, TensorFlow.js with WebGL is 1.5-2x slower than Tensorflow Python with AVX. For training, we have seen small models train faster in the browser and large models train up to 10-15x slower in the browser, compared to TensorFlow Python with AVX.

Please take a look at [this benchmark](https://github.com/tensorflow/tfjs-layers/blob/master/demos/benchmarks_demo.html) to get more detailed performance measurements.

## Do you have any pre-trained models that I can use to get started?

Yes. We are working on organizing these a bit better, but you can take a look at …, … and ....

You can also use almost any pre-trained Keras models in TensorFlow.js via our conversion scripts.

## I still have some questions

Please feel free to look at our [issues tracker](https://github.com/tensorflow/tfjs/issues) and file a bug there. We also have a community mailing list for people to ask questions, get technical help, and share what they are doing with TensorFlow.js! To keep up to date with TensorFlow.js news follow us on twitter or join the announcement only mailing list.

