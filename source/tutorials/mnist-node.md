---
title: mnist
date: 2018-05-29 10:22:00
---

# Running TensorFlow.js on Node

In this tutorial, we'll show how to utilize the power of TenorFlow with TensorFlow.js. We'll be using the MNIST convolutional neural
network in this tutorial - but loading data from binary files instead of the web-based `fromPixels()` method.

## Prerequisites

First, you'll need a machine that supports TensorFlow. See [these directions](https://www.tensorflow.org/install/) for machine and hardware requirements.

## Running the Code

The full code for this tutorial can be found in the [tfjs-examples/mnist-node](https://github.com/tensorflow/tfjs-examples/tree/master/mnist-node) directory in the [TensorFlow.js examples repository](https://github.com/tensorflow/tfjs-examples/tree/master/mnist-node).

You can run the code for the example by cloning the repo and building the demo:

```sh
$ git clone https://github.com/tensorflow/tfjs-examples
$ cd tfjs-examples/mnist-node
$ npm install
$ node index.js
```

This script downloads and trains against the training MNIST set and runs evaluation off of the MNIST test data. Each 20 steps, the console logs the current loss and accuracy of the model. At the end off each pass through the data (called an 'epoch'), the test data is run for evaluation to see how accurate the model is against data it was not trained with.

## Optional: Install GPU Node bindings for CUDA systems

If your system has a NVIDIA® GPU with [CUDA compute support](https://www.tensorflow.org/install/install_linux#NVIDIARequirements), use the GPU package for higher performance (Linux only):

```sh
$ npm install @tensorflow/tfjs-node-gpu --save
```

Change the binding import statement in `index.js`:

```js
const tf = require('@tensorflow/tfjs');
// require('@tensorflow/tfjs-node');
require('@tensorflow/tfjs-node-gpu');
tf.setBackend('tensorflow');
```

Now just run `$ node index.js` again and to execute the script with GPU support.

## Loading MNIST data in Node.js

The browser examples for MNIST use a large image with all the training data embedded. The `tf.fromPixels()` method is used to convert HTML image data to Tensors. In Node.js, we will download binary files that contain training and test information for our model.

Each MNIST dataset is stored in two different files - one containing an embedded representation of each pixel in the image and another file that contains the label for each image. In this tutorial, we will download and use a training and test set for a combination of 4 files.

## Parsing Training and Test Data

The MNIST dataset can be downloaded through Google storage today. To download these files, an async function will be used. This function will check if the passed in file exists on disk. If the file exists, a `Buffer` from that file is returned. If the file does not exist, an `https` request is sent to download the gzip'd version of the file. That stream is unzipped and saved on disk. The contents of that save operation are returned as a `Buffer`.

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

Each set of files contains data stored in binary format. The first few bytes contain header information about the file. After the header bytes, images are stored in `784` byte chunks (`28` x `28` image samples). The labels file contains `1` byte chunks for each label in the corresponding image file (`0-9`).

The `data.js` file contains the logic for converting the entire file, but let's examine a closer look at image conversion. Data is read through the file stored on disk using the Node.js API for [`fs.readFile()`](https://nodejs.org/api/fs.html#fs_fs_readfile_path_options_callback). That API returns a `Buffer` that is used to convert each `768` chunk into a `Float32Array` typed-array. Those values are normalized from the stored pixel values of `1.0-255.0`. This data normalization makes our model train and perform faster.

The `loadImages()` and `loadLabels()` method are similar, but handle byte ordering different.

Loading images sample:

```js
const buffer = fs.readFileSync('training-data-filename');
...
// Normalize pixel data between 0.0 and 1.0:
const downsize = 1.0 / 255.0;
...
let index = IMAGE_HEADER_BYTES;
while (index < buffer.byteLength) {
  const size = 28 * 28;  // Flattened image dimensions
  const array = new Float32Array(size);
  for (let i = 0; i  < size; i++) {
    array[i] = buffer.readUInt8(index++) * downsize;
  }
}
```

Loading labels sample:

```js
const buffer = fs.readFileSync('training-labels-filename');
...
let index = LABEL_HEADER_BYTES;
while (index < buffer.byteLength) {
  const array = new Int32Array(1);  // Single element for labels
  array[i] = buffer.readUInt8(index++);
}
```

## MNIST data serving class

Now that the training and test data have been loaded into memory, we will now create a utility class to make serving
these values as batches of Tensors much easier. The full definiton

```js
// TODO(kreeger): Flush out this section.
```

## Runnning the model with the Node.js bindings:

## Creating the entry point for the Node.js app

Next, let's create the entry point (or use your text editor of choice):

```sh
$ touch index.js
```

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

TODO

```js
```
