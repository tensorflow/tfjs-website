---
title: core-concepts
date: 2018-03-14 16:28:23
---

# Core Concepts in TensorFlow.js

**TensorFlow.js** is an open source WebGL-accelerated JavaScript library for machine intelligence. It brings highly performant machine learning building blocks to your fingertips, allowing you to train neural networks in a browser or run pre-trained models in inference mode.

**TensorFlow.js** provides low level building blocks for machine learning as well as a high level, Keras inspired API for writing neural networks. Let's take a look at some of the core concepts in the library.


## Tensors

The central unit of data in **TensorFlow.js** is the `Tensor`. A `Tensor` consists of a set of numerical values shaped into an array of one or more dimensions. The `shape` attribute defines their shape (i.e. how many values in each dimension of the tensor).

The library provides sugar functions to create for low-rank Tensors: `tf.scalar`, `tf.tensor1D`, `tf.tensor2D`, `tf.tensor3D` and `tf.tensor4D`, as well as helper functions to construct them.

Example usage with a 2x3 matrix:


```js
const shape = [2, 3]; // 2 rows, 3 columns
const a = tf.tensor2d([1.0, 2.0, 3.0, 10.0, 20.0, 30.0], shape);

// The shape can also be inferred
const b = tf.tensor2d([[0.0, 2.0], [4.0, 6.0]]);  // 2 rows, 2 columns
```

Tensors are immutable, that is, once created you cannot change their values. Instead you perform operations on them that generate new tensors.

## Variables

Variables are mutable tensors, they allow us to update the values they store and are primarily used when training a model. As the model trains, it updates values stored in variables.

```js
const initialValues = tf.zeros([10]);
const biases = tf.variable(initialValues);
```


## Operations (Ops)

While Tensors allow us to store data, ops allow us to manipulate data. **TensorFlow.js** comes with a wide variety of mathematical opearations suitable for linear algebra and machine learning. Because tensors are immutable, these operations do not change their input, they instead return new tensors.

These include unary ops like `square()` and binary ops like `add()` and `mul()`.

```js
const a = tf.tensor2d([[1.0, 2.0], [3.0, 4.0]]);
const b = tf.tensor2d([[0.0, 2.0], [4.0, 6.0]]);

// The library has a chainable API allowing you to call operations
// directly as methods on Tensors.
const average = a.sub(b).square().mean();

// All operations are also exposed as functions in the main namespace
// so we could also do.
const avg = tf.mean(tf.square(tf.sub(a, b)));
```

## Models & Layers

Conceptually a model is a function that given some input will produce some _desireable_ output.

In TensorFlow.js there are _two ways_ to create models. You can use _operations_ directly to represent the work the model does. This might looks something like this

```js
function predict(input) {
  // y = a * x ^ 2 + b * x + c
  return dl.tidy(() => {
    const x = dl.scalar(input);

    const ax2 = a.mul(x.square());
    const bx = b.mul(x);
    const y = ax2.add(bx).add(c);

    return y;
  });
}
```

<br />

You can also use the high level API `tf.model` to construct a model out of _layers_, which are a a popular abstraction in deep learning. Below we construct a `tf.sequential` model.


```js
// Creating a model

const model = tf.sequential();
model.add(
  tf.layers.simpleRNN({
    units: 20,
    recurrentInitializer: 'GlorotNormal',
    inputShape: [80, 4]
  })
);

const optimizer = tf.train.sgd(LEARNING_RATE);
model.compile({optimizer, loss: 'categoricalCrossentropy'});
model.fit({x: data, y: labels)});
```

Layers come in various flavours depending on the kind of operation they do on their input and there are many different kinds of layers available in TensorFlow.js. A few examples include, `tf.layers.simpleRNN`, `tf.layers.gru`, and `tf.layers.lstm`.

## Memory Management: Dispose &amp; Tidy

Because TensorFlow.js uses the GPU to accelerate math operations there is a need to manage GPU memory when dealing with tensors and variables.

We provide two functions to help with this, `dispose()` and `tf.tidy`.

### dispose()

You can call dispose on a tensor or variable in order to free up its GPU memory.

```js
const a = tf.tensor2d([[0.0, 2.0], [4.0, 6.0]]);
const result = a.square();
a.dispose();
result.dispose();
```

### tf.tidy()

Using `dispose()` can be cumbersome when doing a lot of tensor operations. We provide another function `tf.tidy()` that plays similar role to regular scopes in JavaScript, but for GPU backed tensors.

`tf.tidy()` executes a function and disposes any intermediate tensors created. It does not dispose the return value of the inner function.

```js
const a = tf.tensor2d([1.0, 2.0, 3.0, 4.0]);

// tf.tidy takes a function to tidy up after
const average = tf.tidy(() => {
  // tf.tidy will clean up all the GPU memory used by tensors inside
  // this function, other than the tensor that is returned.
  //
  // Even in a short sequence of operations like the one below, a number
  // of intermediate tensors get created. So it is a good practice to
  // put your math ops in a tidy!
  return a.sub(b).square().mean();
});
```

Using `tf.tidy()` will help prevent memory leaks in your application and can be used to more carefully control when memory is reclaimed. Note that the function passed to `tf.tidy()` should be synchronous and also not return a Promise. We suggest keeping code that updates the UI or makes remote requests outside of `tf.tidy()`

Note: `tf.tidy` **will not** clean up **variables**. Variables typically last through the entire lifecycle of a machine learning model so we don't clean them up even if they are created in a tidy, however you can call dispose() on them manually.

# Further Resources

Machine Learning is a wide field with many concepts that we are only lightly touching on here, for a more in depth look, take a look at the following resources.

 - [Google's Machine Learning Crash Course Glossary](https://developers.google.com/machine-learning/crash-course/glossary)
