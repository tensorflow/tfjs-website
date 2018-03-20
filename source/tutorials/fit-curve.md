---
title: fit-curve
date: 2018-03-16 16:28:23
---

# Training First Steps: Fitting a Curve to Synthetic Data

In this first example we will have a model learn the parameters for a curve that we want to fit to some data. For this toy example we will generate a synthetic dataset using a polynomial function with some noise added. We will then have the model learn the coefficients used to generate the data.

The **full code** for this tutorial can be found [here](https://github.com/tensorflow/tfjs-examples/tree/master/polynomial-regression-core), we will just look at the interesting parts here and leave out parts like data generation and chart plotting.

To run the code locally do the following:

```
git clone https://github.com/tensorflow/tfjs-examples
cd tfjs-examples/polynomial-regression-core
yarn
yarn watch
```

The [tfjs-examples/polynomial-regression-core](https://github.com/tensorflow/tfjs-examples/tree/master/polynomial-regression-core) directory above is completely standalone so you can copy it to start your own project.

## Input Data

Our data are x-y coordinates that look like this:

<img src="../images/fit_curve_data.png" alt="Input data scatterplot" style="max-width: 500px;" width="500"/>

Here is the polynomial we used:

<img src="../images/fit_curve_function.png" alt="polynomial function" style="maxWidth: 300px;" width="300"/>

The thing we want to learn are the values of 'a', 'b', 'c', and 'd' that produces a nice curve that fits the data.

Lets take a look at how we might learn those values, known as _coefficients_, using TensorFlow.js **operations**.

## Set up variables

Our first step will be to create some variables to hold our current best estimate of these values. Note that we start with random numbers for these values.

```js
const a = tf.variable(tf.scalar(Math.random()));
const b = tf.variable(tf.scalar(Math.random()));
const c = tf.variable(tf.scalar(Math.random()));
const d = tf.variable(tf.scalar(Math.random()));
```

## Write our model

```js
function predict(x) {
  // y = a * x ^ 3 + b * x ^ 2 + c * x + d
  return tf.tidy(() => {
    return a.mul(x.pow(tf.scalar(3)))
      .add(b.mul(x.square()))
      .add(c.mul(x))
      .add(d);
  });
}
```

The code above implements the math in our polynomial function. Using the variables as coefficients. At the start we will get pretty bad results as the values of a, b, c, and d are random.

If we were to plot a curve using these random numbers in our polynomial function, we might get something like this. The orange line represents the values predicted by our model.

<img src="../images/fit_curve_random.png" alt="random coefficients scatterplot" style="maxWidth: 500px;" width="500"/>

## Train our model

The final step is to have the model learn good values for the coefficients. To do this we need two things, a _loss_ function that tells us how good the predictions of the model are, and a _train loop_ that will actually run our training data through our model.

```js
function loss(prediction, labels) {
  // Having a good loss function is key for training a machine learning model
  const meanSquareError = prediction.sub(labels).square().mean();
  return meanSquareError;
}
```

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
```

<br/>

Lets take a closer look at a few of these lines

```js
const learningRate = 0.5;
```

The `learningRate` controls how big the models adjustments will be when its trying to improve its predictions. A low learning rate will make the learning process slow, while a high learning rate might result in the model oscillating around the right values and always overcorrecting.

<br/>

```js
const optimizer = tf.train.sgd(learningRate);
```

The optimizer is responsible for the algorithm that will actually to the learning. This example uses [Stochastic Gradient Descent](https://developers.google.com/machine-learning/crash-course/glossary#SGD)  (SGD) to do the learning. These algorithms are called optimizers because their goal is to optimize the variables we set up earlier to produce high quality predictions.

<br/>

```js
optimizer.minimize(() => {
  const predsYs = predict(xs);
  return loss(predsYs, ys);
});
```

The minimize function is where the magic happens. It takes a function that __uses some variables__ and __returns a loss value__. The loss value is a single positive value (a scalar) that represents how good the model prediction was. In this examples, the predict function uses our variables and the loss function uses the [mean squared error](https://en.wikipedia.org/wiki/Mean_squared_error) metric to estimate quality. The optimizer will _automatically_ adjust any variables used within the callback function in order to _minimize_ loss.


## See the results!

Once the program finishes running, we can take the final values of our variable a, b, c, and d and use them to plot a curve.

<img src="../images/fit_curve_learned.png" alt="Input data scatterplot" style="maxWidth: 500px;" width="500"/>

Much Better than random! The **full code** for this tutorial can be found [here](https://github.com/tensorflow/tfjs-examples/tree/master/polynomial-regression-core) feel free to download it and experiment with some of the different variables in the code.

