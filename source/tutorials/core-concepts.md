---
title: core-concepts
date: 2018-03-14 16:28:23
---

# Core Concepts in TensorFlow.js

**TensorFlow.js** is an open source WebGL-accelerated JavaScript library for machine intelligence. It brings highly performant machine learning building blocks to your fingertips, allowing you to train neural networks in a browser or run pre-trained models in inference mode.

**TensorFlow.js** provides low level building blocks for machine learning as well as a high-level, Keras-inspired API for constructing neural networks. Let's take a look at some of the core components of the library.

## Tensors

The central unit of data in **TensorFlow.js** is the `Tensor`. A `Tensor` consists of a set of numerical values shaped into an array of one or more dimensions. The `shape` attribute defines a `Tensor`'s shape (i.e., how many values are in each dimension of the array).

The primary `Tensor` constructor is the [`tf.tensor`](../api/0.0.1/index.html#tf.tensor) function:

```js
// 2x3 Tensor
const shape = [2, 3]; // 2 rows, 3 columns
const a = tf.tensor([1.0, 2.0, 3.0, 10.0, 20.0, 30.0], shape);
a.print(); // print Tensor values
```

However, for constructing low-rank `Tensor`s, we recommend using the following
functions to enhance code readability: `tf.scalar`, `tf.tensor1d`, `tf.tensor2d`,
`tf.tensor3d` and `tf.tensor4d`.

The following example creates the same `Tensor` as above using `tf.tensor2d`:

```js
const shape = [2, 3]; // 2 rows, 3 columns
const b = tf.tensor2d([1.0, 2.0, 3.0, 10.0, 20.0, 30.0], shape);
b.print();

The shape can also be inferred:

```js
const c = tf.tensor2d([[1.0, 2.0, 3.0], [10.0, 20.0, 30.0]])
c.print();
```

TensorFlow.js also provides convenience functions for creating `Tensor`s with all values
set to 0 (`tf.zeros`) or all values set to 1 (`tf.ones`):

```js
// 3x5 Tensor with all values set to 0
const zeros = tf.zeros([3, 5]);
``` 

`Tensor`s are immutable; once created, you cannot change their values. Instead you perform operations on them that generate new `Tensor`s.

## Variables

Variables store a `Tensor` of values. Unlike `Tensor`s, their values are mutable; you can assign
a new `Tensor` to an existing variable:

```js
const initialValues = tf.zeros([5]);
const biases = tf.variable(initialValues); // initialize biases
biases.print(); // output: [0, 0, 0, 0, 0]

const updatedValues = tf.tensor1d([0, 1, 0, 1, 0]);
biases.assign(updatedValues); // update values of biases
biases.print(); // output: [0, 1, 0, 1, 0]
```

Variables are primarily used to store and then update values during model training.

## Operations (Ops)

While Tensors allow us to store data, ops allow us to manipulate that data. **TensorFlow.js** provides a wide variety of mathematical operations suitable for linear algebra and machine learning that can be performed on `Tensor`s. Because `Tensor`s are immutable, these operations do not change their input; they instead return new `Tensor`s.

Available operations include unary ops such as `square()`:

```js
const d = tf.tensor2d([[1.0, 2.0], [3.0, 4.0]]);
const d_squared = d.square();
d_squared.print();
// Output: [[1, 4 ],
//          [9, 16]]
```

And binary ops such as `add()` and `mul()`:

```js
const e = tf.tensor2d([[1.0, 2.0], [3.0, 4.0]]);
const f = tf.tensor2d([[5.0, 6.0], [7.0, 8.0]]);

const e_plus_f = e.add(f);
e_plus_f.print();
// Output: [[6 , 8 ],
//          [10, 12]]

TensorFlow.js has a chainable API; you can call operations
on the result of operations:

```js
const sq_sum = e.add(f).square();
sq_sum.print();
// Output: [[36 , 64 ],
            [100, 144]]

// All operations are also exposed as functions in the main namespace,
// so you could also do the following:
const sq_sum = tf.square(tf.add(e, f));
```

## Models and Layers

Conceptually, a model is a function that given some input will produce some _desirable_ output.

In TensorFlow.js there are _two ways_ to create models. You can use _operations_ directly to represent the work the model does. For example:

```js
function predict(input) {
  // y = a * x ^ 2 + b * x + c
  return tf.tidy(() => {
    const x = dl.scalar(input);

    const ax2 = a.mul(x.square());
    const bx = b.mul(x);
    const y = ax2.add(bx).add(c);

    return y;
  });
}
```

<br />

You can also use the high-level API `tf.model` to construct a model out of _layers_, which are a a popular abstraction in deep learning. The following code constructs a `tf.sequential` model:


```js
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

There are many different types of layers available in TensorFlow.js. A few examples include, `tf.layers.simpleRNN`, `tf.layers.gru`, and `tf.layers.lstm`.

## Memory Management: Dispose &amp; Tidy

Because TensorFlow.js uses the GPU to accelerate math operations, it's necessary to manage GPU memory when dealing with tensors and variables.

TensorFlow.js provide two functions to help with this: `dispose()` and `tf.tidy`.

### dispose()

You can call dispose on a tensor or variable in order to free up its GPU memory.

```js
const a = tf.tensor2d([[0.0, 2.0], [4.0, 6.0]]);
const result = a.square();
a.dispose();
result.dispose();
```

### tf.tidy()

Using `dispose()` can be cumbersome when doing a lot of tensor operations. TensorFlow.js provides another function, `tf.tidy()`, that plays a similar role to regular scopes in JavaScript, but for GPU backed tensors.

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

Using `tf.tidy()` will help prevent memory leaks in your application and can be used to more carefully control when memory is reclaimed. Note that the function passed to `tf.tidy()` should be synchronous and also not return a Promise. We suggest keeping code that updates the UI or makes remote requests outside of `tf.tidy()`.

**Note:** `tf.tidy` **will not** clean up **variables**. Variables typically last through the entire lifecycle of a machine learning model, so TensorFlow.js doesn't clean them up even if they are created in a tidy; however, you can call dispose() on them manually.

# Additional Resources

See the TensorFlow.js API reference for comprehensive documentation of the library.

For a more in-depth look at machine learning fundamentals, please see the following resources:

* [Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course)
* [Machine Learning Glossary(https://developers.google.com/machine-learning/glossary)
