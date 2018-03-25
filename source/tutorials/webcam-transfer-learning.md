---
title: webcam-transfer-learning
date: 2018-03-25 13:02:23
---

# Transfer learning - Learning to recognize classes from webcam data

[Try the demo here!](https://storage.googleapis.com/tfjs-examples/webcam-transfer-learning/dist/index.html)

In the [core concepts tutorial](./core-concepts.html), we learned how to use
tensors and operations to perform basic linear algebra.

In the [convolutional image classifier tutorial](./mnist.html), we learned how
to build a convolutional image classifier to recognize handwritten digits from
MNIST dataset.

In this tutorial, we will use transfer learning to predict user-defined classes
from webcam data. We'll take that classifier and use it to play Pacman in the
browser, assigning each of 4 user-defined classes to "up", "down", "left", and
"right".

## About this tutorial

To learn to classify different poses from the webcam in a reasonable amount of
time, we will retrain, or "fine-tune", a pretrained MobileNet model, using an
internal activation as input to our new model.

By using an internal activation of MobileNet, we can reuse the features
that MobileNet uses to predict the 1000 classes of ImageNet with a relatively
small amount of retraining.

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

Before we can we're going to load MobileNet into the browser. Remember,
we're going to use an internal activation of MobileNet as an input to a new
model.

```
