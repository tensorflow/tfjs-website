---
title: mnist
date: 2018-03-17 13:28:23
---

# Training on Images: Recognizing Handwritten Digits with a Convolutional Neural Network

In this tutorial, we'll build a TensorFlow.js model to classify handwritten digits with a convolutional neural network. First, we'll train the classifier by having it “look” at thousands of handwritten digit images and their labels. Then we'll evaluate the classifier's accuracy using test data that the model has never seen.

## Prerequisites

This tutorial assumes familiarity with the fundamental building blocks of TensorFlow.js (tensors, variables, and ops), as well as the concepts of optimization and loss. For more background on these topics, we recommend completing the following tutorials before this tutorial:

* [Core Concepts in TensorFlow.js](core-concepts.html)
* [Training First Steps: Fitting a Curve to Synthetic Data](mnist.html)

## Running the Code

The full code for this tutorial can be found in the [tfjs-examples/mnist](https://github.com/tensorflow/tfjs-examples/tree/master/mnist) directory in the [TensorFlow.js examples repository](https://github.com/tensorflow/tfjs-examples/tree/master/mnist).

You can run the code for the example by cloning the repo and building the demo:

```sh
$ git clone https://github.com/tensorflow/tfjs-examples
$ cd tfjs-examples/mnist
$ yarn
$ yarn watch
```

The [tfjs-examples/mnist](https://github.com/tensorflow/tfjs-examples/tree/master/mnist)
directory above is completely standalone, so you can copy it to start your own project.

**NOTE:** The difference between this tutorial's code and the [tfjs-examples/mnist-core](https://github.com/tensorflow/tfjs-examples/tree/master/mnist-core) example is that here we use TensorFlow.js's higher-level APIs (`Model`, `Layer`s) to construct the model, whereas [mnist-core](https://github.com/tensorflow/tfjs-examples/tree/master/mnist-core) uses low-lower linear algebra ops to build a neural network.

## Data

We will use the [MNIST handwriting dataset](http://yann.lecun.com/exdb/mnist/) for this tutorial.
The handwritten MNIST digits we will learn to classify look like this:

<img src="../images/mnist_4.png" alt="mnist 4" width=100/> <img src="../images/mnist_3.png" alt="mnist 3" width=100/> <img src="../images/mnist_8.png" alt="mnist 8" width=100/>

To preprocess our data, we've written [data.js](https://github.com/tensorflow/tfjs-examples/blob/master/mnist-core/data.js), which contains the class `MnistData` that fetches random batches of MNIST images from a hosted version of the MNIST dataset we provide for convenience. 

`MnistData` splits the entire dataset into training data and test data. When we train the model, the classifier will see only the training set. When we evaluate the model, we'll use only the data in the test set, which the model has not yet seen, to see how well the model's predictions generalize to brand-new data.

`MnistData` has two public methods:

* `nextTrainBatch(batchSize)`: returns a random batch of images and their labels from the training set
* `nextTestBatch(batchSize)`: returns a batch of images and their labels from the test set

**NOTE:** When training the MNIST classifier, it's important to randomly shuffle the data, so the model's predictions aren't affected by the order in which we feed it images. For example, if we were to feed the model all the *1* digits first, during this phase of training, the model might learn to simply predict *1* (since this minimizes the loss). If we were to then feed the model only *2*s, it might simply switch to predicting only *2* and never predict a *1* (since, again, this would minimize loss for the new set of images). The model would never learn to make an accurate prediction over a representative sample of digits.

## Building the Model

In this section, we'll going to build a convolutional image classifier model. To do so, we'll use a `Sequential` model (the simplest type of model), in which tensors are consecutively passed from one layer to the next.

First, let's instantiate our `Sequential` model with `tf.sequential`:

```js
const model = tf.sequential();
```

Now that we've created a model, let's add layers to it. 

### Adding the First Layer

The first layer we’ll add is a two-dimensional convolutional layer. Convolutions slide a filter window over an image to learn transformations that are spatially invariant (that is, patterns or objects in different parts of the image will be treated the same way). For more information about convolutions, see [this article](http://colah.github.io/posts/2014-07-Understanding-Convolutions/).

We can create our 2-D convolutional layer using [`tf.layers.conv2d`](https://bigpicture.teams.x20web.corp.google.com/js.tensorflow.org/api/0.0.1/index.html#layers.conv2d), which accepts a configuration object that defines the layer's structure:

```js
model.add(tf.layers.conv2d({
  inputShape: [28, 28, 1],
  kernelSize: 5,
  filters: 8,
  strides: 1,
  activation: 'relu',
  kernelInitializer: 'VarianceScaling'
}));
```

Let’s break down each argument in the configuration object:

* `inputShape`. The shape of the data that will flow into the first layer of the model. In this case, our MNIST examples are 28x28-pixel black-and-white images. The canonical format for image data is `[row, column, depth]`, so here we want to configure a shape of `[28, 28, 1]`—28 rows and columns for the number of pixels in each dimension, and a depth of 1 because our images have only 1 color channel:

```js
inputShape: [28, 28, 1]
```

* `kernelSize`. The size of the sliding convolutional filter windows to be applied to the input data. Here, we set a `kernelSize` of `5`, which specifies a square, 5x5 convolutional window.


* `filters`. The number of filter windows of size `kernelSize` to apply to the input data. Here, we will apply 8 filters to the data.

* `strides`. The "step size" of the sliding window—i.e., how many pixels the filter will shift each time it moves over the image. Here, we specify strides of 1, which means that the filter will slide over the image in steps of 1 pixel.

* `activation`. The [activation function](https://developers.google.com/machine-learning/glossary/#activation_function) to apply to the data after the convolution is complete. In this case, we are applying a [Rectified Linear Unit (ReLU)](https://developers.google.com/machine-learning/glossary/#ReLU) function, which is a very common activation function in ML models.

* `kernelInitializer`. The method to use for randomly initializing the model weights, which is very important to training dynamics. We won’t go into the details of initialization here, but `VarianceScaling` (used here) is generally a good initializer choice.

## Adding the Second Layer

Let’s add a second layer to the model: a max pooling layer, which we'll create using [`tf.layers.maxPooling2d`](../api/0.0.1/index.html#tf.layers.maxPooling2d). This layer will downsample the result (also known as the activation) from the convolution by computing the maximum value for each sliding window:

```js
model.add(tf.layers.maxPooling2d({
  poolSize: [2, 2],
  strides: [2, 2]
}));
```

Let’s break down the arguments:

* `poolSize`. The size of the sliding pooling windows to be applied to the input data. Here, we set a `poolSize` of `[2,2]`, which means that the pooling layer will apply 2x2 windows to the input data.

* `strides`. The "step size" of the sliding pooling window—i.e., how many pixels the window will shift each time it moves over the input data. Here, we specify strides of `[2, 2]`, which means that the filter will slide over the image in steps of 2 pixels in both horizontal and vertical directions.

**NOTE:** Since both `poolSize` and `strides` are 2x2, the pooling windows will be completely non-overlapping. This means the pooling layer will cut the size of the activation from the previous layer in half.

### Adding the Remaining Layers

Repeating layer structure is a common pattern in neural networks. Let's add a second convolutional layer, followed by another pooling layer to our model. Note that in our second convolutional layer, we're doubling the number of filters from 8 to 16. Also note that we don't specify an `inputShape`, as it can be inferred from the shape of the output from the previous layer:

```js
model.add(tf.layers.conv2d({
  kernelSize: 5,
  filters: 16,
  strides: 1,
  activation: 'relu',
  kernelInitializer: 'VarianceScaling'
}));

model.add(tf.layers.maxPooling2d({
  poolSize: [2, 2],
  strides: [2, 2]
}));
```

Next, let's add a [`flatten`](../api/0.0.1/index.html#tf.layers.flatten) layer to flatten the output of the previous layer to a vector:

```js
model.add(tf.layers.flatten());
```

Lastly, let's add a [`dense`](../api/0.0.1/index.html#tf.layers.dense) layer (also known as a fully connected layer), which will perform the final classification. Flattening the output of a convolution+pooling layer pair before a dense layer is another common pattern in neural networks:

```js
model.add(tf.layers.dense({
  units: 10,
  kernelInitializer: 'VarianceScaling',
  activation: 'softmax'
}));
```

Let’s break down the arguments passed to the `dense` layer.

* `units`. The size of the output activation. Since this is the final layer, and we’re doing a 10-class classification task (digits 0–9), we use 10 units here. (Sometimes units are referred to as the number of *neurons*, but we’ll avoid that terminology.)

* `kernelInitializer`. We'll use the same `VarianceScaling` initialization strategy for the dense layer that we used for the convolutional layers.

* `activation`. The activation function of the last layer for a classification task is usually [softmax](https://developers.google.com/machine-learning/glossary/#softmax). Softmax normalizes our 10-dimensional output vector into a probability distribution, so that we have a probability for each of the 10 classes.

## Training the Model

To actually drive training of the model, we'll need to construct an optimizer and define a loss function. We'll also define an evaluation metric to measure how well our model performs on the data.

**NOTE:** For a deeper dive into optimizers and loss functions in TensorFlow.js, see the tutorial [Training First Steps](fit-curve.html).

### Defining the Optimizer

For our convolutional neural network model, we'll use a [stochastic gradient descent (SGD) optimizer](https://developers.google.com/machine-learning/glossary/#SGD) with a learning rate of 0.15:

```js
const LEARNING_RATE = 0.15;
const optimizer = tf.train.sgd(LEARNING_RATE);
```

### Defining Loss

For our loss function, we'll use cross-entropy (`categoricalCrossentropy`), which is commonly used to optimize classification tasks. `categoricalCrossentropy` measures the error between the probability distribution generated by the last layer of our model and the probability distribution given by our label, which will be a distribution with 1 (100%) in the correct class label. For example, given the following label and prediction values for an example of the digit *7*:

|class     | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|----------|---|---|---|---|---|---|---|---|---|---|
|label     | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
|prediction|.1 |.01|.01|.01|.20|.01|.01|.60|.03|.02|

`categoricalCrossentropy` gives a lower loss value if the prediction is a high probability that the digit is *7*, and a higher loss value if the prediction is a low probability of *7*. During training, the model will update its internal parameters to minimize `categoricalCrossentropy` over the whole dataset.

### Defining the Evaluation Metric

For our evaluation metric, we'll use accuracy, which measures the percentage of correct predictions out of all predictions.

### Compiling the Model

To compile the model, we pass it a configuration object with our optimizer, loss function, and a list of evaluation metrics (here, just `'accuracy'`):

```js
model.compile({
  optimizer: optimizer,
  loss: 'categoricalCrossentropy',
  metrics: ['accuracy'],
});
```

## Configuring Batch Size

Before we begin training, we need to define a few more parameters related to batch size:

```js
// How many examples the model should "see" before making a parameter update.
const BATCH_SIZE = 64;
// How many batches to train the model for.
const TRAIN_BATCHES = 100;

// Every TEST_ITERATION_FREQUENCY batches, test accuracy over TEST_BATCH_SIZE examples. 
// Ideally, we'd compute accuracy over the whole test set, but for performance 
// reasons we'll use a subset.
const TEST_BATCH_SIZE = 1000;
const TEST_ITERATION_FREQUENCY = 5;
```

#### More About Batching and Batch Size

To take full advantage of the GPU's ability to parallelize computation, we want to batch multiple inputs together and feed them through the network using a single feed-forward call.

Another reason we batch our computation is that during optimization, we update
internal parameters (taking a step) only after averaging gradients from several
examples. This helps us avoid taking a step in the wrong direction because of
an outlier example (e.g., a mislabeled digit).

When batching input data, we introduce a tensor of rank *D+1*, where *D* is the dimensionality of
a single input.

As discussed earlier, the dimensionality of a single image in our MNIST data set is `[28, 28, 1]`.
When we set a `BATCH_SIZE` of 64, we're batching 64 images at a time, which means the actual
shape of our data is `[64, 28, 28, 1]` (the batch is always the outermost dimension).

*NOTE:** Recall that the `inputShape` in the config of our first `conv2d` did not specify the batch size (64). Configs are written to be batch-size-agnostic, so that they are able to accept batches of arbitrary size.

### Coding the Training Loop

Here is the code for the training loop:

```js
for (let i = 0; i < TRAIN_BATCHES; i++) {
  const batch = data.nextTrainBatch(BATCH_SIZE);
 
  let testBatch;
  let validationData;
  // Every few batches test the accuracy of the mode.
  if (i % TEST_ITERATION_FREQUENCY === 0) {
    testBatch = data.nextTestBatch(TEST_BATCH_SIZE);
    validationData = [
      testBatch.xs.reshape([TEST_BATCH_SIZE, 28, 28, 1]), testBatch.labels
    ];
  }
 
  // The entire dataset doesn't fit into memory so we call fit repeatedly
  // with batches.
  const history = await model.fit({
    x: batch.xs.reshape([BATCH_SIZE, 28, 28, 1]),
    y: batch.labels,
    batchSize: BATCH_SIZE,
    validationData,
    epochs: 1
  });

  const loss = history.history.loss[0];
  const accuracy = history.history.acc[0];

  // ... plotting code ...
}
```

Let's break the code down. First, we fetch a batch of training examples. Recall from above that we batch examples to take advantage of GPU parallelization and to average evidence from many examples before making a parameter update:

```js
const batch = data.nextTrainBatch(BATCH_SIZE);
```

Every 5 steps (our `TEST_ITERATION_FREQUENCY`, we construct `validationData`, an array of two elements containing a batch of MNIST images from the test set and their corresponding labels. We'll use this data to evaluate the accuracy of the model:

```js
if (i % TEST_ITERATION_FREQUENCY === 0) {
  testBatch = data.nextTestBatch(TEST_BATCH_SIZE);
  validationData = [
    testBatch.xs.reshape([TEST_BATCH_SIZE, 28, 28, 1]),
    testBatch.labels
  ];
}
```

`model.fit` is where the model is trained and parameters actually get updated.

**NOTE:** Calling `model.fit()` once on the whole dataset will result in uploading the
whole dataset to the GPU, which could freeze the application. To avoid uploading
too much data to the GPU, we recommend calling `model.fit()` inside a `for` loop, 
passing a single batch of data at a time, as shown below:

```js
// The entire dataset doesn't fit into memory so we call fit repeatedly
// with batches.
const history = await model.fit({
  x: batch.xs.reshape([BATCH_SIZE, 28, 28, 1]),
  y: batch.labels,
  batchSize: BATCH_SIZE,
  validationData: validationData,
  epochs: 1
});
```

Let's break down the arguments again:

* `x`. Our input image data. Remember that we are feeding examples in batches so we must tell the
`fit` function how large our batch is. `MnistData.nextTrainBatch` returns images with shape `[BATCH_SIZE, 784]`—all the data for the image in a 1-D vector of length 784 (28 * 28). However, our model expects image data in the shape `[BATCH_SIZE, 28, 28, 1]`, so we [`reshape`](../api/0.0.1/index.html#tf.reshape) accordingly. 

* `y`. Our labels; the correct digit classifications for each image.

* `batchSize`. How many images to include in each training batch. Earlier we set a `BATCH_SIZE` of 64 to use here.

* `validationData`. The validation set we construct every `TEST_ITERATION_FREQUENCY` (here, 5) batches. This data is in the shape `[TEST_BATCH_SIZE, 28, 28, 1]`. Earlier, we set a `TEST_BATCH_SIZE` of 1000. Our evaluation metric (accuracy) will be computed over this data set.

* `epochs`. Number of training runs to perform on a batch. Since we are iteratively feeding batches to `fit`, we only want it to train from this batch a single time.

Each time we call `fit`, it returns a rich object that contains logs of our metrics, which we store in `history`. We extract our loss and accuracy for each training iteration, so we can plot them on a graph: 

```js
  const loss = history.history.loss[0];
  const accuracy = history.history.acc[0];
```

## See the Results!

If you run the full code, you should see output like this:

<img src="../images/mnist_learned.png" alt="Two plots. The first plot shows loss vs. training batch, with loss trending downward from batch 0 to batch 100. The second plot shows accuracy vs. test batch, with accuracy trending upward from batch 0 to batch 100" style="max-width: 500px;"/>

It looks like the model is predicting the right digit for most of the images. Great work!

## Additional Resources

* For more on convolution, see [Understanding Convolutions](http://colah.github.io/posts/2014-07-Understanding-Convolutions/) by Chris Olah.

* For more on loss, see [Descending into ML](https://developers.google.com/machine-learning/crash-course/descending-into-ml/) in [Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course/) for a more in-depth introduction to machine learning loss.

* For more on gradient descent and SGD, see [Reducing Loss](https://developers.google.com/machine-learning/crash-course/reducing-loss/) in [Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course/).