---
title: webcam-transfer-learning
date: 2018-03-25 13:02:23
---

# Transfer learning - Train a classifier from webcam data

Before we begin, we highly recommend playing with the demo.
[Try it here!](https://storage.googleapis.com/tfjs-examples/webcam-transfer-learning/dist/index.html)

In the [core concepts tutorial](./core-concepts.html), we learned how to use
tensors and operations to perform basic linear algebra.

In the [convolutional image classifier tutorial](./mnist.html), we learned how
to build a convolutional image classifier to recognize handwritten digits from
MNIST dataset.

In this tutorial, we will use transfer learning to predict user-defined classes
from webcam data. We'll take that classifier and use it to play Pacman in the
browser, assigning each of 4 user-defined classes to "up", "down", "left", and
"right".

## About the game

We hightly recommend playing the game before reading this tutorial.

There are three phases of the game.

1. Data collection. In this phase, the user will associate frames from the
webcam with each of the 4 classes, up, down, left, and right.
2. Training. In this phase, we'll train a model given this data.
3. Inference / Playing. In this phase, we'll use the model we just trained to
make predictions from the webcam data for up, down, left, right and feed those
into the pacman game!

## About the model

To learn to classify different classes from the webcam in a reasonable amount of
time, we will retrain, or "fine-tune", a pretrained MobileNet model, using an
internal activation as input to our new model.

To do this, we'll actually have two models on the page.

One model will be the pretrained
MobileNet model that is modified to output an internal activation. We'll call
this the "modified MobileNet model". This model does not get trained.

The second
model will take as input the output of the
internal activation of the modified MobileNet model. This is the model we'll
train.

By using an internal activation of MobileNet, we can reuse the features
that MobileNet uses to predict the 1000 classes of ImageNet with a relatively
small amount of retraining.

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

## Data

Before we can train our model, we need a way to fetch Tensors from the webcam.

We've provided a class in `webcam.js` called `Webcam` which reads images from
a \<video\> as a TensorFlow.js `Tensor`.

Let's take a look at the `capture` method on `Webcam`.

```js
  capture() {
    return tf.tidy(() => {
      const webcamImage = tf.fromPixels(this.webcamElement);
      const croppedImage = this.cropImage(webcamImage);
      const batchedImage = croppedImage.expandDims(0);

      return croppedImage.asType('float32').div(oneTwentySeven).sub(one);
    });
  }
```

Let's break down these lines.

```js
const webcamImage = tf.fromPixels(this.webcamElement);
```

This line reads a single frame from the webcam \<video\> element and returns a
`Tensor`. This Tensor will be of shape `[height, width, 3]`. The inner most
dimension, `3`, corresponds to the three channels, RGB. `height` and `width`
are both 224 in our example as that

See the [documentation for fromPixels](https://js.tensorflow.org/api/0.6.0/index.html#fromPixels) for supported input HTML element types.

```js
const croppedImage = this.cropImage(webcamImage);
```

When a webcam element is setup, the aspect ratio is rectangular, however the
MobileNet model wants a square input image. This line crops out a square
centered block from the webcam element. By default, webcam video elements pad
the top and bottom of the image with white space. While this will probably
still work, MobileNet was not trained on images with white padding, which may
throw off the model and reduce overall performance.

```js
const batchedImage = croppedImage.expandDims(0);
```

`expandDims` creates a new dimension of size 1. In this case, the image we read
from the webcam is of shape `[224, 224, 3]`. Calling `expandDims(0)` reshapes
this tensor to `[1, 224, 224, 3]`, which represents a batch of a single image. We do this because TensorFlow.js models expect a batch of inputs.

```js
croppedImage.asType('float32').div(oneTwentySeven).sub(one);
```

In one line, we cast the image to `float32` and normalize it between -1 and 1.
We know the values from the image are between 0-255 by default, so to normalize
between -1 and 1 we divide by 127 and subtract 1.

Note: `oneTwentySeven` and `one` are constructed outside the `Webcam` so we
don't have to continually create and destroy those Tensors inside of
`capture()`.

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

Note: We chose this layer emperically - it worked well for our task. Generally
speaking, a layer towards the end of a pretrained model will perform better in
transfer learning tasks as it contains higher-level semantic features of the
input. Try choosing another layer and see how it affects model quality! You can
use `model.layers` to print the layers of the model.

Note: check out the [Importing a Keras model](./import-keras.html) tutorial for
details on how to port a Keras model to TensorFlow.js.

## Collecting the data

The first phase of the game is the data-collection phase. Here, the user will
save frames from the webcam and associate them with each of the 4 classes:
up, down, left, and right.

When we're collecting frames from the webcam, we're going to immediately feed
them through the modified MobileNet model and save the activation `Tensor`s.
We don't need to save the original images that are captured from the webcam - the model that we will train uses these activations as inputs. Later, when
we make a prediction from the webcam to actually play the game, we'll first
feed the frames through the modified MobileNet model and then feed them through
our second model.

We've provided a `ControllerDataset` class which saves these activations so
they can be used during our training phase. `ControllerDataset` has a single
method, `addExample`. This will be called with the activation from our modified
MobileNet.

When new examples are added, we will keep two `Tensor`s that represent the
entire dataset, `xs`, and `ys`. These will be used as inputs to the the model
we're going to train.

`xs` represents all of the activations for all
of the collected data, and `ys` represents the labels for all of the collected data as a "one hot" representation. When we train our model, we will feed it the entire dataset of `xs` and `ys`.

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
const y = tf.oneHot(tf.tensor1d([label]), this.numClasses);
```

This line converts a number corresponding to the label to a one-hot
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

When we have already added an example to our dataset, we'll concat the new
example to the set of existing examples by calling `concat`, with the `axis`
param set to `0`. This will stack all our input activations into `xs` and our
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
