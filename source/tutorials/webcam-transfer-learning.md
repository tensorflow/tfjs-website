---
title: webcam-transfer-learning
date: 2018-03-25 13:02:23
---

# Transfer learning - Train a neural network to predict from webcam data

Before we begin, we highly recommend playing with the demo.
[Try it here!](https://storage.googleapis.com/tfjs-examples/webcam-transfer-learning/dist/index.html)

In the [core concepts tutorial](./core-concepts.html), we learned how to use
tensors and operations to perform basic linear algebra.

In the [convolutional image classifier tutorial](./mnist.html), we learned how
to build a convolutional image classifier to recognize handwritten digits from
MNIST dataset.

In the [Importing a Keras model tutorial](./import-keras.html) we learned how
to port an pretrained Keras model to the browser for inference.

In this tutorial, we will use transfer learning to predict user-defined classes
from webcam data (poses, objects, facial expressions, etc) and play Pacman by
assigning each of those poses to "up", "down", "left", and "right".

## About the game

There are three phases of the game.

1. **Data collection:** the player will associate images from the
webcam with each of the 4 classes, up, down, left, and right.
2. **Training:** train a neural network to predict the class from the input images.
3. **Inference / Playing:** use the model we trained to
make predictions from the webcam data for up, down, left, right and feed those
into the Pacman game!

## About the model(s)

To learn to classify different classes from the webcam in a reasonable amount of
time, we will *retrain*, or *fine-tune*, a pretrained
[MobileNet](https://github.com/tensorflow/models/blob/master/research/slim/nets/mobilenet_v1.md)
model, using an internal activation (the output from an internal layer of MobileNet)
as input to our new model.

To do this, we'll actually have two models on the page.

One model will be the pretrained
MobileNet model that is truncated to output an internal activation. We'll call
this the "truncated MobileNet model". This model does not get trained after
being loaded into the browser.

The second
model will take as input the output of the
internal activation of the truncated MobileNet model and will predict
probabilities for each of the 4 output classes, up, down, left, and right. This
is the model we'll actually train in the browser.

By using an internal activation of MobileNet, we can reuse the features
that MobileNet has already learned to predict the 1000 classes of ImageNet with
a relatively small amount of retraining.

## About this tutorial

You can run the code for the example by cloning the repo and building the demo:

```sh
git clone https://github.com/tensorflow/tfjs-examples
cd tfjs-examples/webcam-transfer-learning
yarn
yarn watch
```

The [tfjs-examples/webcam-transfer-learning](https://github.com/tensorflow/tfjs-examples/tree/master/webcam-transfer-learning)
directory above is completely standalone so you copy it to start your own project.

*Note: This approach is different than the approach taken in
[Teachable Machine](https://teachablemachine.withgoogle.com/). Teachable
machine uses K-nearest neighbors (KNN) on the predictions from a pretrained
SqueezeNet model to do classification, while this approach uses a second neural
network trained from an internal activation of MobileNet. The KNN image
classifier works much better with smaller amounts of data, but a neural network
with transfer learning generalizes much better. Go play with both demos and
explore how the two different ways to do webcam prediction differ!*

## Data

Before we can train our model, we need a way to fetch `Tensor`s from the webcam.

We've provided a class in `webcam.js` called `Webcam` which reads images from
a `<video>` tag as a TensorFlow.js `Tensor`.

Let's take a look at the `capture` method on `Webcam`.

```js
capture() {
  return tf.tidy(() => {
    const webcamImage = tf.fromPixels(this.webcamElement);
    const croppedImage = this.cropImage(webcamImage);
    const batchedImage = croppedImage.expandDims(0);

    return batchedImage.toFloat().div(oneTwentySeven).sub(one);
  });
}
```

Let's break down these lines.

```js
const webcamImage = tf.fromPixels(this.webcamElement);
```

This line reads a single frame from the webcam `<video>` element and returns a
`Tensor` of shape `[height, width, 3]`. The inner most
dimension, `3`, corresponds to the three channels, RGB.

See the documentation for [tf.fromPixels](../api/latest/index.html#fromPixels) for supported input HTML element types.

```js
const croppedImage = this.cropImage(webcamImage);
```

When a square webcam element is setup, the natural aspect ratio of the webcam
feed is rectangular (the browser will put white space around the rectangular
image to make it square).

However, the MobileNet model wants a square input image. This line crops out a square
centered block of size `[224, 224]` from the webcam element. Note that there is
more code in `Webcam` which increases the size of the video element so we can
crop a square `[224, 224]` block without getting white padding.

```js
const batchedImage = croppedImage.expandDims(0);
```

`expandDims` creates a new outer dimension of size 1. In this case, the cropped
image we read from the webcam is of shape `[224, 224, 3]`. Calling
`expandDims(0)` reshapes this tensor to `[1, 224, 224, 3]`, which represents
a batch of a single image. MobileNet expects batched inputs.

```js
batchedImage.toFloat().div(tf.scalar(127)).sub(tf.scalar(1));
```

In this line, we cast the image to floating point and normalize it between -1
and 1 (this is how the model was trained).
We know the values from the image are between 0-255 by default, so to normalize
between -1 and 1 we divide by 127 and subtract 1.

```js
return tf.tidy(() => {
  ...
});
```

By calling `tf.tidy()`, we're telling TensorFlow.js to destroy the memory for
the intermediate `Tensor`s we allocate inside `capture()`. See the
[Core Concepts tutorial](./core-concepts.html) for more information about
memory management and `tf.tidy()`

## Loading mobilenet

Before we set up our model, we need to load a pretrained MobileNet into the
webpage. From this model, we'll construct a new model, which outputs an
internal activation from MobileNet.

Here is the code to do that:

```js
async function loadMobilenet() {
  const mobilenet = await tf.loadModel(
      'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json');

  // Return a model that outputs an internal activation.
  const layer = mobilenet.getLayer('conv_pw_13_relu');
  return tf.model({inputs: model.inputs, outputs: layer.output});
});
```

By calling `getLayer('conv_pw_13_relu')`, we're reaching in to an internal
layer of the pretrained MobileNet model, and constructing a new model where the
inputs are the same inputs of MobileNet, but output the layer that is the
intermediate layer of MobileNet, named `conv_pw_13_relu`.

*Note: We chose this layer empirically - it worked well for our task. Generally
speaking, a layer towards the end of a pretrained model will perform better in
transfer learning tasks as it contains higher-level semantic features of the
input. Try choosing another layer and see how it affects model quality! You can
use `model.layers` to print the layers of the model.*

*Note: check out the [Importing a Keras model](./import-keras.html) tutorial for
details on how to port a Keras model to TensorFlow.js.*

## Phase 1: Collecting the data

The first phase of the game is the data-collection phase. The user will
save frames from the webcam and associate them with each of the 4 classes:
up, down, left, and right.

When we're collecting frames from the webcam, we're going to immediately feed
them through the truncated MobileNet model and save the activation tensors
We don't need to save the original images that are captured from the webcam because the model that we will train only needs these activations as inputs. Later, when
we make a prediction from the webcam to actually play the game, we'll first
feed the frames through the truncated MobileNet model and then feed the output
of the truncated Mobilenet model through our second model.

We've provided a `ControllerDataset` class which saves these activations so
they can be used during our training phase. `ControllerDataset` has a single
method, `addExample`. This will be called with the activation `Tensor` from our
truncated MobileNet and the associated `label` as a `number`.

When new examples are added, we will keep two `Tensor`s that represent the
entire dataset, `xs` and `ys`. These will be used as inputs to the the model
we're going to train.

`xs` represents all of the activations from the truncated MobileNet for all
of the collected data, and `ys` represents the labels for all of the collected
data as a "one hot" representation. When we train our model, we will feed it
the entire dataset of `xs` and `ys`.

*For more details on one-hot encodings, checkout the [MLCC glossary](https://developers.google.com/machine-learning/crash-course/glossary#o).*

Let's take a look at the implementation.

```js
addExample(example, label) {
  const y = tf.tidy(() => tf.oneHot(tf.tensor1d([label]), this.numClasses));

  if (this.xs == null) {
    this.xs = tf.keep(example);
    this.ys = tf.keep(y);
  } else {
    const oldX = this.xs;
    this.xs = tf.keep(oldX.concat(example, 0));

    const oldY = this.ys;
    this.ys = tf.keep(oldY.concat(y, 0));

    oldX.dispose();
    oldY.dispose();
    y.dispose();
  }
}
```

Let's break this function down.

```js
const y = tf.tidy(() => tf.oneHot(tf.tensor1d([label]), this.numClasses));
```

This line converts an integer corresponding to the label to a one-hot
representation of that label.

For example, if `label = 1` correspond to the "left" class, the one-hot
representation will be `[0, 1, 0, 0]`. We do this transformation so that this
represents a probability distribution, with 100% probability in the class 1, "left"

```js
if (this.xs == null) {
  this.xs = tf.keep(example);
  this.ys = tf.keep(y);
}
```

When we add the first example to our dataset, we'll simply hold onto the given
values.

We call `tf.keep()` on the input `Tensor`s so that they do not get disposed by
any `tf.tidy()` that may wrap the call to `addExample`. See [Core Concepts](./core-concepts.html) for more on memory management.

```js
} else {
  const oldX = this.xs;
  this.xs = tf.keep(oldX.concat(example, 0));

  const oldY = this.ys;
  this.ys = tf.keep(oldY.concat(y, 0));

  oldX.dispose();
  oldY.dispose();
  y.dispose();
}
```

When we have already added an example to our dataset, we'll concatenate the new
example to the set of existing examples by calling `concat`, with the `axis`
param set to `0`. This continously stacks our input activations into `xs` and our
labels into `ys`. We'll then dispose() any of the old values of `xs` and `ys`.

For example if our first label (1) looked like:
```
[[0, 1, 0, 0]]
```

Then after a second call to `addExample` with `label = 2`, `ys` will look like:

```
[[0, 1, 0, 0],
 [0, 0, 1, 0]]
```

`xs` will have a similar shape, but of higher dimensionality because we are
using a 3D activation (making `xs` be 4D where the outer most dimension is the
number of examples collected).

Now, coming back to `index.js` where the core logic is defined, we have defined:

```js
ui.setExampleHandler(label => {
  tf.tidy(() => {
    const img = webcam.capture();
    controllerDataset.addExample(mobilenet.predict(img), label);
    // ...
  });
});
```

In this block, we're registering a handler with the UI to handle when one of
the up, down, left, or right buttons are pressed, where `label` corresponds to
the class index: 0, 1, 2, or 3.

In this handler, we simply capture a frame from the webcam, feed it through our
truncated MobileNet which generates an internal activation, and we save that in
our `ControllerDataset` object.

## Phase 2: Training the model

Once the user has collected all of the examples from webcam data with
associated classes, we should train our model!

First, let's set up the topology of our model. We'll create a 2-layer dense
(fully connected) model, with a `relu` activation function after the first
dense layer.

```js
model = tf.sequential({
  layers: [
    // Flattens the input to a vector so we can use it in a dense layer. While
    // technically a layer, this only performs a reshape (and has no training
    // parameters).
    tf.layers.flatten({inputShape: [7, 7, 256]}),
    tf.layers.dense({
      units: ui.getDenseUnits(),
      activation: 'relu',
      kernelInitializer: 'varianceScaling',
      useBias: true
    }),
    // The number of units of the last layer should correspond
    // to the number of classes we want to predict.
    tf.layers.dense({
      units: NUM_CLASSES,
      kernelInitializer: 'varianceScaling',
      useBias: false,
      activation: 'softmax'
    })
  ]
});
```

You'll notice the first layer of the model is actually a `flatten` layer. We
need to flatten the input to a vector so we can use them in a dense layer. The
`inputShape` argument to the flatten layer corresponds to the shape of the
activation from our truncated MobileNet.

The next layer we'll add is a dense layer. We're going to initialize it
with units chosen by the user from the UI, use a `relu`
activation function, use the `varianceScaling` kernel initializer, and we'll add bias.

The last layer we'll add is another dense layer. We'll initialize this with the
the number of units corresponding to the number of classes we want to predict.
We'll use a `softmax` activation function which means we interpret the output of
the last layer as a probability distribution over the possible classes.

*Check out the [API reference](../api/latest/index.html#layers.dense)
for details on the arguments to the layer constructors or check out the
[convolutional MNIST tutorial](./mnist.html).*

```js
const optimizer = tf.train.adam(ui.getLearningRate());
model.compile({optimizer: optimizer, loss: 'categoricalCrossentropy'});
  ```

Here is where we construct our optimizer, define our loss function, and compile
the model to prepare it to be trained.

We're using the `Adam` optimizer here, which emperically worked well for this
task. Our loss function, `categoricalCrossentropy`, will measure the error
between the predicted probability distribution over our 4 classes and the true
label (the one-hot encoding label).

```js
const batchSize =
    Math.floor(controllerDataset.xs.shape[0] * ui.getBatchSizeFraction());
```

Since our dataset is dynamic (the user defines how large of a dataset to collect),
we adapt our batch size accordingly. The user will likely not collect thousands
of examples, so our batch size likely won't be too large.

Now let's train the model!

```js
model.fit(controllerDataset.xs, controllerDataset.ys, {
  batchSize,
  epochs: ui.getEpochs(),
  callbacks: {
    onBatchEnd: async (batch, logs) => {
      // Log the cost for every batch that is fed.
      ui.trainStatus('Cost: ' + logs.loss.toFixed(5));
      await tf.nextFrame();
    }
  }
});
```

`model.fit` can take the entire dataset as `xs` and `ys`, which we pass from
our controller dataset.

We set the `epochs` from the UI, allowing the user to define how long to train the model for.

We also register an `onBatchEnd` callback which gets called after the internal
training loop of `fit` finishes training a batch, allowing us to show the user
the intermediate cost value as the model is training. We `await tf.nextFrame()`
to allow the UI to update during training.

*Refer to the [convolutional MNIST tutorial](./mnist.html) for a tutorial
describing more details of this loss function.*

## Phase 3: Playing Pacman

Once our model is trained, and our cost value has gone down, we can make
predictions from the webcam!

Here is the prediction loop:

```js
while (isPredicting) {
  const predictedClass = tf.tidy(() => {
    const img = webcam.capture();
    const activation = mobilenet.predict(img);
    const predictions = model.predict(activation);
    return predictions.as1D().argMax();
  });

  const classId = (await predictedClass.data())[0];
  predictedClass.dispose();

  ui.predictClass(classId);
  await tf.nextFrame();
}
```

Let's break down the lines:

```js
const img = webcam.capture();
```

As we've seen before, this captures a frame from the webcam as a `Tensor`.

```js
const activation = mobilenet.predict(img);
```

Now, feed the webcam frame through our truncated MobileNet model to get
the internal MobileNet activation.

```js
const predictions = model.predict(act);
```

Now, feed the activation through our trained model to get a set of predictions.
This is a probability distribution over the output classes (each of the 4 values
in this prediction vector represent a probability for that class).

```js
predictions.as1D().argMax();
```

Finally, flatten the output, and call `argMax`. This returns the index with the
highest value (probability). This corresponds to the predicted class.

```js
const classId = (await predictedClass.data())[0];
predictedClass.dispose();

ui.predictClass(classId);
```

Now that we have a scalar `Tensor` with our prediction, download it and show
it in the UI!  (Note we do need to manually dispose the `Tensor` here after
obtaining its value, because we are in an async context that can't be wrapped in
`tf.tidy()`.)

## Wrapping up

That's it! You've now learned how to train a neural network to predict from a
set of user-defined classes. And the images never leave the browser!

If you fork this demo to make modifications, you may have to change the model
parameters to get to to work for your task.
