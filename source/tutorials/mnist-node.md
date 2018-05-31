---
title: mnist-node
date: 2018-05-29 10:22:00
---

# MNIST training with Node.js

In this tutorial, we'll show how to utilize the power of TensorFlow's Eager C library with TensorFlow.js running under Node.js. We’ll be using the [MNIST CNN model](mnist.html) in this tutorial - but we’ll be primarily focusing on code that is Node.js specific to TensorFlow.js.

## Prerequisites

This tutorial will skim over some specific details, so make sure you are up-to-speed on the following items:

* An install of [Node v8.* or higher](https://nodejs.org/en/)
  * We recommend [NVM](https://github.com/creationix/nvm) for managing Node installs
* A machine that [supports TensorFlow](https://www.tensorflow.org/install/)
* Core Concepts in [TensorFlow.js](core-concepts.html)
* Understanding of the [MNIST tutorial](mnist.html)

## Running the tutorial

You can run the code for the example by cloning the repo and executing the index.js script:

```sh
$ git clone https://github.com/tensorflow/tfjs-examples
$ cd tfjs-examples/mnist-node
$ npm install
$ node index.js
```

This application downloads, trains, and evaluates against the MNIST dataset. Every 20 steps, a console log shows the current loss and accuracy of the model. At the end of each pass through the training data (called an 'epoch'), the test data is run for evaluation to see how accurate the model is.

## Binding Installation & Loading

In this tutorial, our main application script (index.js) loads the Node.js binding and sets the backend to ’tensorflow’. These couple lines of code enables high-performance, multi-threaded TensorFlow code to be executed through Node.js!

```js
// Main imports in index.js:
const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');
tf.setBackend('tensorflow');
```

### Optional - Enable GPU Support (Linux only)

TensorFlow.js also ships a package that enables GPU support. If your system has a NVIDIA® GPU with [CUDA compute support](https://www.tensorflow.org/install/install_linux#NVIDIARequirements), use the GPU package for higher performance:

First, install the GPU Node.js binding package:

```sh
$ npm install @tensorflow/tfjs-node-gpu --save
```

Next update the import statement in index.js to use the GPU binding.

```js
// Change main imports in index.js:
...
require('@tensorflow/tfjs-node-gpu');  // Load the GPU package
tf.setBackend('tensorflow');
...
```

Finally - re-run index.js: `$ node index.js`

## Loading MNIST data from disk

In the [browser-based tutorial for MNIST](mnist.html), training data is generated from [one large PNG file](https://storage.googleapis.com/learnjs-data/model-builder/mnist_images.png) that is read off of a browser canvas. In Node.js we do not have access to the browser canvas so our training data will be generated from pre-built binary files.

MNIST stores data in two matching files: one containing all of the images, and a matching file containing the labels for those images. In this tutorial, we will download 2 sets of MNIST files. The first set will be used for training and the second set will be used for testing the accuracy of the model.

### Getting the data

To download these binary files, an [async function](https://javascript.info/async-await) will be used for returning a [Promise](https://javascript.info/promise-basics) for our data fetching.

The first step is to declare some constants that the data.js file uses for downloading MNIST files:

```js
const BASE_URL = 'https://storage.googleapis.com/cvdf-datasets/mnist/';
const TRAIN_IMAGES_FILE = 'train-images-idx3-ubyte';
const TRAIN_LABELS_FILE = 'train-labels-idx1-ubyte';
const TEST_IMAGES_FILE = 't10k-images-idx3-ubyte';
const TEST_LABELS_FILE = 't10k-labels-idx1-ubyte';
```

Next, the following function is used for downloading a given filename only once and returning a `Buffer` to the contents of that file:

```js
// Downloads a test file only once and returns the buffer for the file.
async function fetchOnceAndSaveToDiskWithBuffer(filename) {
  return new Promise(resolve => {
    const url = `${BASE_URL}${filename}.gz`;
    if (fs.existsSync(filename)) {
      resolve(readFile(filename));
      return;
    }
    const file = fs.createWriteStream(filename);
    console.log(`  * Downloading from: ${url}`);
    https.get(url, (response) => {
      const unzip = zlib.createGunzip();
      response.pipe(unzip).pipe(file);
      unzip.on('end', () => {
        resolve(readFile(filename));
      });
    });
  });
}
```

### Parsing the data

Once the data has been downloaded, it must be converted from binary format to a [typed array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays). Each MNIST file contains a few bytes of header information depending on the type of file (image or label).

To help with parsing, a few constants are needed:

```js
// Image file constants:
const IMAGE_HEADER_MAGIC_NUM = 2051;
const IMAGE_HEADER_BYTES = 16;
const IMAGE_DIMENSION_SIZE = 28;
const IMAGE_FLAT_SIZE = IMAGE_DIMENSION_SIZE * IMAGE_DIMENSION_SIZE;

// Label file constants:
const LABEL_HEADER_MAGIC_NUM = 2049;
const LABEL_HEADER_BYTES = 8;
const LABEL_RECORD_BYTE = 1;
const LABEL_FLAT_SIZE = 10;
```

Each file contains a few bytes of header information which can be parsed using a utility function:

```js
function loadHeaderValues(buffer, headerLength) {
  const headerValues = [];
  for (let i = 0; i < headerLength / 4; i++) {
    // Header data is stored in-order (aka big-endian)
    headerValues[i] = buffer.readUInt32BE(i * 4);
  }
  return headerValues;
}
```

MNIST image files contain images stored in 784 byte chunks (each image is 28 x 28 pixels). After loading the Buffer and validating the header contents, each image chunk is stored in a Float32Array and stashed in an array. These typed arrays will be used to create Tensors when they are needed for the model.

Here is the method to handle loading an image file’s buffer, validating the header, and converting binary data into Float32Array elements:

```js
async function loadImages(filename) {
  const buffer = await fetchOnceAndSaveToDiskWithBuffer(filename);

  // Validate header contents:
  const headerBytes = IMAGE_HEADER_BYTES;
  const recordBytes = IMAGE_DIMENSION_SIZE * IMAGE_DIMENSION_SIZE;
  const headerValues = loadHeaderValues(buffer, headerBytes);
  assert.equal(headerValues[0], IMAGE_HEADER_MAGIC_NUM);
  assert.equal(headerValues[2], IMAGE_DIMENSION_SIZE);
  assert.equal(headerValues[3], IMAGE_DIMENSION_SIZE);

  // Normalize pixel values:
  const downsize = 1.0 / 255.0;

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

Next, let’s look at handling the label files. MNIST label files contain every label stored in 1 byte chunks (representing the values 0-9). Label parsing is very similar to the image file conversion - but we will use Int32Array instances to store the label data:

```js
async function loadLabels(filename) {
  const buffer = await fetchOnceAndSaveToDiskWithBuffer(filename);

  // Validate header contents:
  const headerBytes = LABEL_HEADER_BYTES;
  const recordBytes = LABEL_RECORD_BYTE;
  const headerValues = loadHeaderValues(buffer, headerBytes);
  assert.equal(headerValues[0], LABEL_HEADER_MAGIC_NUM);

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

Now our data is loaded into memory and ready to be converted to Tensors for the model to use. The `data.js` file contains more details for handling batches, shuffling, and epoch iteration. Please see that file for more details.

## Summary

This tutorial highlights how the same model code used in a [browser-specific example](mnist.html) can be run server side using Node.js. The only key differences for running server side is the bootstrapping of the Node.js bindings and our MNSIT data pipeline. By training and running in Node.js with TensorFlow you’ll have access to a larger spectrum of resources that the browser can not currently provide.
