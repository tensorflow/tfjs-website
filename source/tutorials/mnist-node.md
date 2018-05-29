---
title: mnist
date: 2018-05-29 10:22:00
---

# Running TensorFlow.js on Node

In this tutorial, we'll show how to utilize the power of TenorFlow with TensorFlow.js. We'll be using the MNIST convolutional neural
network in this tutorial - but loading data from binary files instead of the `fromPixels()` method.

## Prerequisites

First, you'll need a machine that supports TensorFlow. See these directions for machine and hardware requirements.

## Running the Code

The full code for this tutorial can be found in the [tfjs-examples/mnist-node](https://github.com/tensorflow/tfjs-examples/tree/master/mnist-node) directory in the [TensorFlow.js examples repository](https://github.com/tensorflow/tfjs-examples/tree/master/mnist-node).


## Create a Node.js package

The first step for any new Node project is to create a new folder for hosting our application.

```sh
$ mkdir mnist-node && cd mnist-node
```

After creating the folder, initialize the project using npm or yarn and use the default options at the prompt:

```sh
$ npm init
```

## Install TensorFlow.js with the Node bindings

```sh
$ npm install @tensorflow/tfjs @tensorflow/tfjs-node --save
# or
$ yarn add @tensorflow/tfjs @tensorflow/tfjs-node
```

## Creating the entry point for the Node.js app

Next, let's create the entry point (or use your text editor of choice):

```sh
$ touch index.js
```

## Loading Training and Test Data

The MNIST dataset can be downloaded through Google storage today. Data and labels are broken up into individual files, so
downloading training and test sets will require 4 fetches.

First, let's declare some constants for acquiring the files:

```js
const BASE_URL = 'https://storage.googleapis.com/cvdf-datasets/mnist/';
const TRAIN_IMAGES_FILE = 'train-images-idx3-ubyte';
const TRAIN_LABELS_FILE = 'train-labels-idx1-ubyte';
const TEST_IMAGES_FILE = 't10k-images-idx3-ubyte';
const TEST_LABELS_FILE = 't10k-labels-idx1-ubyte';
```

To download these files, an async function will be used. This function will check if the passed in file exists on
disk. If the file exists, a `Buffer` is returned. If the file does not exist, an `https` request is sent to download the gzip'd
version of the file. That stream is unzipped and saved on disk. The contents of that save operation are returned as a `Buffer`.

```js
async function fetchOnceAndSaveToDiskWithBuffer(filename) {
  return new Promise(resolve => {
    const url = `${BASE_URL}${filename}.gz`;
    if (fs.existsSync(filename)) {
      // Return buffer in Promise resolve.
      resolve(readFile(filename));
      return;
    }
    const file = fs.createWriteStream(filename);
    console.log(`  * Downloading from: ${url}`);
    https.get(url, (response) => {
      const unzip = zlib.createGunzip();
      response.pipe(unzip).pipe(file);
      unzip.on('end', () => {
        // Return buffer in Promise resolve.
        resolve(readFile(filename));
      });
    });
  });
}
```

## Converting binary data to Tensors

Each training or test file contains data stored in binary format. The first few bytes contains information about
the file. To help convert image or label data, let's write a helper function:

```js
// Utility function for loading header data:
function loadHeaderValues(buffer, headerLength) {
  const headerValues = [];
  for (let i = 0; i < headerLength / 4; i++) {
    // Header data is stored in-order (aka big-endian)
    headerValues[i] = buffer.readUInt32BE(i * 4);
  }
  return headerValues;
}
```

Image data files store each image as a flatten pixel array (28 x 28). Parse through each 784 pixels and store
those values normalized (each pixel is 0-255) in a `Float32Array`.

```js
// Image data constants:
const IMAGE_HEADER_MAGIC_NUM = 2051;
const IMAGE_HEADER_BYTES = 16;
const IMAGE_DIMENSION_SIZE = 28;

// Returns image data from a training or test file:
async function loadImages(filename) {
  const buffer = await fetchOnceAndSaveToDiskWithBuffer(filename);

  const headerBytes = IMAGE_HEADER_BYTES;
  const recordBytes = IMAGE_DIMENSION_SIZE * IMAGE_DIMENSION_SIZE;

  // Validate header attributes:
  const headerValues = loadHeaderValues(buffer, headerBytes);
  assert.equal(headerValues[0], IMAGE_HEADER_MAGIC_NUM);
  assert.equal(headerValues[2], IMAGE_DIMENSION_SIZE);
  assert.equal(headerValues[3], IMAGE_DIMENSION_SIZE);

  // Normalize pixel data between 0.0 and 1.0:
  const downsize = 1.0 / 255.0;

  // Store each image chunk in a typed array.
  // Each chunk will be converted to a Tensor later.
  const images = [];
  let index = headerBytes;
  while (index < buffer.byteLength) {
    const array = new Float32Array(recordBytes);
    for (let i = 0; i < recordBytes; i++) {
      array[i] = buffer.readUInt8(index++) * downsize;
    }
    images.push(array);
  }

  assert.equal(images.length, headerValues[1]);
  return images;
}
```

Each corresponding image has a matching label at the index of each image. Very similar to the image data conversion,
we need to store each binary chunk in a typed array - this time we will use an `Int32Array` for label storage (labels
are number values 0-9):

```js
// Label data constants:
const LABEL_HEADER_MAGIC_NUM = 2049;
const LABEL_HEADER_BYTES = 8;
const LABEL_RECORD_BYTE = 1;

// Returns label data from a training or test file:
async function loadLabels(filename) {
  const buffer = await fetchOnceAndSaveToDiskWithBuffer(filename);

  const headerBytes = LABEL_HEADER_BYTES;
  const recordBytes = LABEL_RECORD_BYTE;

  // Validate header attributes:
  const headerValues = loadHeaderValues(buffer, headerBytes);
  assert.equal(headerValues[0], LABEL_HEADER_MAGIC_NUM);

  // Store each chunk in a typed array.
  const labels = [];
  let index = headerBytes;
  while (index < buffer.byteLength) {
    const array = new Int32Array(recordBytes);
    for (let i = 0; i < recordBytes; i++) {
      array[i] = buffer.readUInt8(index++);
    }
    labels.push(array);
  }

  assert.equal(labels.length, headerValues[1]);
  return labels;
}
```

## Converting data into Tensors

Now that the training and test data have been loaded into memory, we will now create a utility class to make serving
these values as batches of Tensors much easier.

```js
// TODO(kreeger): Flush out this section.
```

## Runnning the model with the Node.js bindings:

To run this application with the power of TensorFlow, we must load the Node binding and set the backend to `'tensorflow'`:

```js
const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');
tf.setBackend('tensorflow');
```

TODO

```js
// Training method
async function train() {
  let step = 0;
  while (data.hasMoreTrainingData()) {
    const batch = data.nextTrainBatch(BATCH_SIZE);
    const history = await model.fit(
        batch.image, batch.label, {batchSize: BATCH_SIZE, shuffle: true});

    // Every 20 steps, log out loss and accuracy:
    if (step % 20 === 0) {
      const loss = history.history.loss[0].toFixed(6);
      const acc = history.history.acc[0].toFixed(4);
      console.log(`  - step: ${step}: loss: ${loss}, accuracy: ${acc}`);
    }
    step++;
  }
  return step;
}
```

TODO

```js
// Test method
async function test() {
  if (!data.hasMoreTestData()) {
    data.resetTest();
  }
  const evalData = data.nextTestBatch(TEST_SIZE);
  const output = model.predict(evalData.image);
  const predictions = output.argMax(1).dataSync();
  const labels = evalData.label.argMax(1).dataSync();

  // Check to see if each prediction matches up to the correct label:
  let correct = 0;
  for (let i = 0; i < TEST_SIZE; i++) {
    if (predictions[i] === labels[i]) {
      correct++;
    }
  }
  const accuracy = ((correct / TEST_SIZE) * 100).toFixed(2);
  console.log(`* Test set accuracy: ${accuracy}%\n`);
}
```

## Load the TensorFlow bindings

## Run the model
