---
title: fit-curve
date: 2018-03-16 16:28:23
---

# Training First Steps: Fitting a Curve to Synthetic Data

In this tutorial, we'll use TensorFlow.js to fit a curve to a synthetic dataset. Given some data generated using a polynomial function with some noise added, we'll train a model to discover the coefficients used to generate the data.

## Prerequisites

This tutorial assumes familiarity with the fundamental building blocks of TensorFlow.js introduced in [Core Concepts in TensorFlow.js](core-concepts.html): tensors, variables, and ops. We recommend completing Core Concepts before doing this tutorial.

## Running the Code

This tutorial focuses on the TensorFlow.js code used to build the model and learn its coefficients.
The full code for this tutorial (including the data-generation and chart-plotting code) can be found [here](https://github.com/tensorflow/tfjs-examples/tree/master/polynomial-regression-core).

To run the code locally, do the following:

```
$ git clone https://github.com/tensorflow/tfjs-examples
$ cd tfjs-examples/polynomial-regression-core
$ yarn
$ yarn watch
```

The [tfjs-examples/polynomial-regression-core](https://github.com/tensorflow/tfjs-examples/tree/master/polynomial-regression-core) directory above is completely standalone so you can copy it to start your own project.

## Input Data

Our synthetic data set is composed of x- and y-coordinates that look as follows when plotted on a Cartesian plane:

<img src="../images/fit_curve_data.png" alt="Input data scatterplot. Data approximates a cubic function with a local minimum around (-0.6, 0) and a local maximum around (0.4, 1)" style="max-width: 500px;" width="500"/>

This data was generated using a cubic function of the format *y* = *a*x<sup>3</sup> + *b*x<sup>2</sup> + *c*x + *d*. 

Our task is to learn the _coefficients_ of this function: the values of *a*, *b*, *c*, and *d* that best fit the data. Let's take a look at how we might learn those values using TensorFlow.js operations.

## Step 1: Set up Variables

First, let's create some variables to hold our current best estimate of these values at each step of model training. To start, we'll assign each of these variables a random number:

```js
const a = tf.variable(tf.scalar(Math.random()));
const b = tf.variable(tf.scalar(Math.random()));
const c = tf.variable(tf.scalar(Math.random()));
const d = tf.variable(tf.scalar(Math.random()));
```

## Step 2: Build a Model

We can represent our polynomial function *y* = *a*x<sup>3</sup> + *b*x<sup>2</sup> + *c*x + *d* in
TensorFlow.js by chaining a series of mathematical operations: addition ([`add`](../api/0.0.1/index.html#tf.add)), multiplication ([`mul`](../api/0.0.1/index.html#tf.mul)), and exponentiation ([`pow`](../api/0.0.1/index.html#tf.pow) and [`square`](../api/0.0.1/index.html#tf.square)). 

The following code constructs a `predict` function that takes `x` as input and returns `y`:

```js
function predict(x) {
  // y = a * x ^ 3 + b * x ^ 2 + c * x + d
  return tf.tidy(() => {
    return a.mul(x.pow(tf.scalar(3))) // a * x^3
      .add(b.mul(x.square())) // + b * x ^ 2
      .add(c.mul(x)) // + c
      .add(d);
  });
}
```

Let's go ahead and plot our polynomial function using the random values for *a*, *b*, *c*, and *d* that we set in Step 1. Our plot will likely look something like this:

<img src="../images/fit_curve_random.png" alt="Cubic function that poorly fits the data in the previous graph. The function hovers far above the data from x=-1.0 to x=0, and then zooms upward from x=0.2 to x=1.0, while the data points move downward." style="maxWidth: 500px;" width="500"/>

Because we started with random values, our function is likely a very poor fit for the data set. The model has yet to learn better values for the coefficients.


## Step 3: Train the Model

Our final step is to train the model to learn good values for the coefficients. To train our model, we need to define three things: 

* A _loss function_, which measures how well a given polynomial fits the data. The lower the loss value, the better the polynomial fits the data.

* An _optimizer_, which implements an algorithm for revising our coefficient values based on the output of the loss function. The optimizer's goal is to minimize the output value of the loss function.

* A _training loop_, which will iteratively run the optimizer to minimize loss.

### Define the Loss Function

For this tutorial, we'll use [mean squared error (MSE)](https://devsite.googleplex.com/machine-learning/glossary/#MSE) as our loss function. MSE is calculated by squaring the difference between the actual *y* value and the predicted *y* value for each *x* value in our data set, and then taking the mean of all the resulting terms.

We can define a MSE loss function in TensorFlow.js as follows:

```js
function loss(predictions, labels) {
  // Subtract our labels (actual values) from predictions, square the results,
  // and take the mean.
  const meanSquareError = predictions.sub(labels).square().mean();
  return meanSquareError;
}
```

### Define the Optimizer

For our optimizer, we'll use [Stochastic Gradient Descent](https://developers.google.com/machine-learning/crash-course/glossary#SGD) (SGD). SGD works by taking the [gradient](https://developers.google.com/machine-learning/crash-course/glossary#gradient) of a random point in our data set and using its value to inform whether to increase or decrease the value of our model coefficients. 

TensorFlow.js provides a convenience function for performing SGD, so that you don't have to worry about performing all these mathematical operations yourself. [`tf.train.sdg`](../api/0.0.1/index.html#tf.train.sgd) takes as input a desired learning rate, and returns an `SGDOptimizer` object, which can be invoked to optimize the value of the loss function.

The _learning rate_ controls how big the model's adjustments will be when improving its predictions. A low learning rate will make the learning process run more slowly (more training iterations needed to learn good coefficients), while a high learning rate will speed up learning but might result in the model oscillating around the right values, always overcorrecting.

The following code constructs an SGD optimizer with a learning rate of 0.5:

```js
const learningRate = 0.5;
const optimizer = tf.train.sgd(learningRate);
```

### Define the Training Loop

Now that we've defined our loss function and optimizer, we can build a training loop, which iteratively performs SGD to refine our model's coefficients to minimize loss (MSE). Here's what our loop looks like:

```js
function train(xs, ys, numIterations) {
  const numIterations = 75;

  const learningRate = 0.5;
  const optimizer = tf.train.sgd(learningRate);

  for (let iter = 0; iter < numIterations; iter++) {
    optimizer.minimize(() => {
      const predsYs = predict(xs);
      return loss(predsYs, ys);
    });
  }
}
```

<br/>

Let's take a closer look at the code, step by step. First, our training function takes the *x* and *y* values of our dataset, as well as a specified number of iterations, as input:

```js
function train(xs, ys, numIterations) {
...
}
```

Next, we define the learning rate and SGD optimizer as discussed in the previous section:

```js
  const learningRate = 0.5;
  const optimizer = tf.train.sgd(learningRate);
```

Finally, we set up a for loop that runs `numIterations` training iterations. In each iteration,
we invoke [`minimize`](../api/0.0.1/index.html#class:tf.train.Optimizer) on the optimizer, which is where the magic happens. `minimize` takes a function that does two things:

1. It predicts *y* values (`predYs`) for all the *x* values using the `predict` model function we defined earlier in Step 2. 

2. It returns the mean squared error loss for those predictions using the loss function we defined earlier in **Define the Loss Function**. 

`minimize` then automatically adjusts any variables used by this function (here, the coefficients `a`, `b`, `c`, and `d`) in order to minimize the return value (our loss). 

After running our training loop, `a`, `b`, `c`, and `d` will contain the coefficient values learned by the model after 75 iterations of SGD.

## See the Results!

Once the program finishes running, we can take the final values of our variables `a`, `b`, `c`, and `d`, and use them to plot a curve:

<img src="../images/fit_curve_learned.png" alt="A cubic curve that nicely approximates the shape of our data" style="maxWidth: 500px;" width="500"/>

The result is much better than the curve we originally plotted using random values for the coefficient.

## Additional Resources

* See ["Core Concepts in TensorFlow.js"](core-concepts.html) for an introduction to the core building blocks in TensorFlow.js: tensors, variables, and ops.

* See ["Descending into ML"](https://developers.google.com/machine-learning/crash-course/descending-into-ml/) in [Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course/) for a more in-depth introduction to machine learning loss
* See ["Reducing Loss"](https://developers.google.com/machine-learning/crash-course/reducing-loss/) in [Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course/) for a deeper dive into gradient descent and SGD.

