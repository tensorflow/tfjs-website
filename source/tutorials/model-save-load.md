---
title: model-save-load
date: 2018-05-10 16:04:23
---

# Saving and Loading `tf.Model`s

No deep learning API is complete without the capability to save and load
trained models. TensorFlow.js is no exception to this rule.
Consider the fact that you can load pretrained
[load](https://js.tensorflow.org/tutorials/import-keras.html)
Models into the browser. The loaded models can be fine-tuned by using
from data available in the browser, such as image and audio data from
browser-attached sensors. How do you save the fine-tuned weight values
in a way that can be loaded up later,
so that the model will be in a already-fine-tuned state when the user accesses the
page again? Also, consider the fact that the Layers API allows you to create
models called
[`tf.Model`](https://js.tensorflow.org/api/latest/#class:Model)s from scratch
in the browser. You can imagine building some kind of UI to let user interactively
build up a model by combining from various types of layers. How do you save the
topology of models built this way? These needs are addressed by the save/load API,
available in TensorFlow.js since version 0.11.0.

Saving and loading `tf.Model`s are achieved with the `tf.Model.save` and
`tf.loadModel` methods, respectively. We designed these APIs to be similar to
[the save and load_model API](https://keras.io/getting-started/faq/#how-can-i-save-a-keras-model)
of Keras. But the browser environment is quite different from the backend environment
on which most familiar deep learning frameworks like Keras run on, particularly in its
richer array of routes of persisting and transimitting data
artifacts. Therefore you will see some interesting differences between
the save/load APIs in TensorFlow.js and in Keras.

## Saving `tf.Model`s

Let's start from the most basic, hassle-free way of saving a `tf.Model`: to
the local storage of the web browser. Local storage is a simple and standard
client-side data store. Data stored in it can persist across multiple
accesses to the same page. You can learn more about it at this
[MDN page](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

Suppose you have a `tf.Model` object. Be it created by using the Layers API
from scratch or loaded by using `tf.loadModel` from a pretrained Keras model,
you can save it to local storage with a single line like the following:

```js
const saveResult = await model.save('localstorage://my-model-1');
console.log('Model saving succeeded: result: ', saveResult);
```

A few things are worth pointing out:
- The `save` method takes a scheme-based, URL-like string argument. In this
  case we use the `localstorage://` scheme to specify the model is to be
  saved to local storage. (Below we will list other schemes available.)
- The scheme is followed by a "path", which is an arbitrary string that
  uniquely identifies the model you are saving. It will be used when you
  load model (see below).
- The `save` method is `async`, so you need to use `then` or `await` on if it
  its completion forms the precondition of subsequent operations.
- The `save` method returns a `SaveResult` object, which carries information
  such as the sizes of the model's topology and weight artifacts.

The table below lists all currently supported routes of saving models and their
respecitve schemes.

| Route                      | Scheme string     | Example                                          |
| -------------------------- | ----------------- | ------------------------------------------------ |
| Browser Local Storage      | `localstorage://` | `await model.save('localstorage://my-model-1');` |
| Browser IndexedDB          | `indexeddb://`    | `await model.save('indexeddb://my-model-1');`    |
| Trigger file downlads      | `downloads://`    | `await model.save('downloads://my-model-1');`    |
| HTTP request               | `http://` or `https://` | `await model.save('http://model-server/upload');` |