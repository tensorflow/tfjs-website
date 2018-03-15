---
title: core-concepts
date: 2018-03-14 16:28:23
---

# Core Concepts in TensorFlow.js

**TensorFlow.js** is an open source WebGL-accelerated JavaScript library for machine intelligence. It brings highly performant machine learning building blocks to your fingertips, allowing you to train neural networks in a browser or run pre-trained models in inference mode.

**TensorFlow.js** provides low level building blocks for machine learning as well as a high level, Keras compatible API for writing neural networks. Let's take a look at some of the core concepts in the library.


## Tensors

The central unit of data in **TensorFlow.js** is the `Tensor`. A `Tensor` consists of a set of numerical values shaped into an array one or more dimensions. The `shape` attribute to defines their shape (i.e. how many values in each dimension of the tensor).

The library provides sugar subclasses for low-rank Tensors: `Scalar`, `Tensor1D`, `Tensor2D`, `Tensor3D` and `Tensor4D`, as well as helper functions to construct them.

Example usage with a 2x3 matrix:


```js
let shape = [2, 3]; // 2 rows, 3 columns
let a = tf.tensor2d([1.0, 2.0, 3.0, 10.0, 20.0, 30.0], shape);

// TensorFlow.js can also infer the shape
let b = tf.tensor2d([[0.0, 2.0], [4.0, 6.0]]);  // 2 rows, 2 columns
```

Tensors are immutable, that is, once created you cannot change their values, instead you perform operations on them that generate new tensors.

## Variables

Variables are mutable tensors, they allow us to update the values they store and are primarily used when training a model. As the model trains it updates values stored in variables.

```js
const initialValues = tf.zeros([10]);
const biases = tf.variable(initialValues);
```


## Operations (Ops)

While Tensors allow us to store data, ops allow us to manipulate data. **TensorFlow.js** comes with a wide variety of mathematical opearations suitable for linear algebra and machine learning.

These include unary ops like `square()` and binary ops like `add()` and `mul()`.

```js
let a = tf.tensor2d([[1.0, 2.0], [3.0, 4.0]]);
let b = tf.tensor2d([[0.0, 2.0], [4.0, 6.0]]);

// The library has a chainable API allowing you to call operations
// directly as methods on Tensors.
let average = a.sub(b).square().mean();

// All operations are also exposed as functions in the main namespace
// so we could also do.
let avg = tf.mean(tf.square(tf.sub(a, b)));
```

## Models

Conceptually a model is a function that given some input will produce some _desireable_ output. In TensorFlow.js we can train models to produce the output we want by showing them lots of examples. Models can be constructed using plain functions, or using a higher level API used to create _neural networks_.


```js
// Creating a model

const model = tf.sequential({});
model.add(
  tf.layers.simpleRNN({
  units: 20,
  recurrentInitializer: 'GlorotNormal',
  inputShape: [80, 4]
}));
```

## Layers

One way to think of a neural networks is as a stack of _layers_ that perform various operations on the input to the model and pass the result from one _layer_ to the next. Layers come in various flavours depending on the kind of operation they do on their input. Here are a few examples of what it looks like to create a layer in TensorFlow.js.

```js
const rnn = tf.layers.simpleRNN({
  units: hiddenSize,
  recurrentInitializer: 'GlorotNormal',
  inputShape: [maxLen, vocabularySize]
});

const gru = tf.layers.gru({
  units: hiddenSize,
  recurrentInitializer: 'GlorotNormal',
  inputShape: [maxLen, vocabularySize]
}));

const lstm = tf.layers.lstm({
  units: hiddenSize,
  recurrentInitializer: 'GlorotNormal',
  inputShape: [maxLen, vocabularySize]
});
```

## Training

At the heart of many machine learning problems is the question of actually _training_ the machine to do some task. We typically train a model by giving it input for which we know the desired output. We compare the models current predictions with what we expect and adjust the model parameters accordingly.

The lower level API for this is encapsulated by _Optimizers_.

While the **Model** api encapsulates this process at a higher level and uses _optimizers_ under the hood.

See our training tutorials to get a sense of the various ways to train a model in TensorFlow.js

## Memory Management: Dispose &amp; Tidy

Because TensorFlow.js uses the GPU to accelerate math operations there is a need to manage GPU memory when _directly_ dealing with tensors.

We provide two functions to help with this, `dispose()` and `tf.tidy`.

### dispose()

You can call dispose on a tensor or variable in order to clear up its GPU memory.

```js
let a = tf.tensor2d([[0.0, 2.0], [4.0, 6.0]]);
let result = a.square();
a.dispose();
result.dispose();
```

### tf.tidy()

Using `dispose()` can be cumbersome when doing a lot of tensor operations. We provide another function `tf.tidy()` that plays similar role to regular scopes in JavaScript, but for GPU backed tensors.

`tf.tidy()` takes a function and will dispose any tensors created within that function other that what the function returns.

```js
let a = tf.tensor2d([1.0, 2.0, 3.0, 4.0]);

// tf.tidy takes a function to tidy up after
let average = tf.tidy(() => {
  // tf.tidy will clean up all the GPU memory used by tensors inside
  // this function, other than the tensor that is returned.
  //
  // Even in a short sequence of operations like the one below, a number
  // of intermediate tensors get created. So it is a good practice to
  // put your math ops in a tidy!
  return a.sub(b).square().mean();
});
```

Using `tf.tidy()` will help prevent memory leaks in your application and can be used to more carefully control when memory is reclaimed. Note that they function passed to `tf.tidy()` should be synchronous, we suggest keeping code that updates the UI or makes remote requests outside of `tf.tidy()`

Note: `tf.tidy` **will not** clean up **variables**. Variables typically last through the entire lifecycle of a machine learning model so we don't clean them up even if they are created in a tidy.

# Further Resources

Machine Learning is a wide field with many concepts that we are only lightly touching on here, for a more in depth look, take a look at the following resources.

 - [Google's Machine Learning Crash Course Glossary](https://developers.google.com/machine-learning/crash-course/glossary)
