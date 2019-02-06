# Saving and Loading TensorFlow.js models

TensorFlow.js provides functionality for saving and loading models that have been created with
the [tf.layers](https://js.tensorflow.org/api/0.14.2/#Models) API. These may be models you have
trained yourself or those trained by others. A key benefit of using the
tf.layers api is that the models created with it are serializable and this is what we will explore
in this tutorial.

This tutorial will focus on saving and loading TensorFlow.js models (identifiable by JSON files). We can also import TensorFlow Python models.
Loading these models are covered in the following two tutorials:

  - [TODO] TK add link to Keras Model Importing tutorial
  - [TODO] TK add link to Python Graphdef Model Importing tutorial


## Saving a tf.Model

[`tf.Model`](https://js.tensorflow.org/api/0.14.2/#class:Model) and [`tf.Sequential`](https://js.tensorflow.org/api/0.14.2/#class:Model)
both provide a function [`model.save`](https://js.tensorflow.org/api/0.14.2/#tf.Model.save) that allow you to save the
_topology_ and _weights_ of a model.

> Topology: This is a file describing the architecture of a model (i.e. what operations it uses) as contains references
> to model weights that are stored externally.

> Weights: These are binaray files that store the weights of a give model in a space efficient format. They are generally
> stored in the same folder as the topology.

Let's take a look at what the code for saving a model looks like

```js
const saveResult = await model.save('localstorage://my-model-1');
```

A few things to note:

- The `save` method takes a URL-like string argument that starts with a **scheme**. This described the type of destination we are trying to save a model to. In the example above the scheme is `localstorage://`
- The scheme is followed by a **path**. In the example above the path is `my-model-1`.
- The `save` method is asynchronous.
- The return value of `model.save` is a JSON object that carries information such as the byte sizes of the model's topology and weights.

Below we will examine the different schemes available.

### Local Storage (Browser only)

**Scheme:** `localstorage://`

```js
const saveResult = await model.save('localstorage://my-model-1');
```

This saves a model to a key in the browsers [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage). This will persist between refreshes, though  local storage can be cleared by users or the browser itself if space becomes a concern. Each browser also sets their own limit on how much data can be stored in local storage for a given domain.

### IndexedDB (Browser only)

**Scheme:** `indexeddb://`

```js
model.save('indexeddb://my-model-1');
```

This saves a model to the browsers [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) storage. Like local storage it persists between refreshes, it also tends to have larger limits on the size of objects stored.

### File Downloads (Browser only)

**Scheme:** `indexeddb://`

```js
model.save('indexeddb://my-model-1');
```

This will cause the browser to download files that represent the model to the users machine. Two files will be produced:

 1. A text JSON file named `[my-model-1].json`, which carries the topology and reference to the weights file described below.
  2. A binary file carrying the weight values named `[my-model-1].weights.bin`.

Generally these files should be kept together as the json file has a reference to the `.bin` file that assumes they are in the same folder.

Note: some browsers require users to grant permissions before more than one
file can be downloaded at the same time.


### HTTP(S) Request

**Scheme:** `http://` or `https://`

```js
model.save('http://model-server.domain/upload')
```

This will create a web request to save a model to a remote server. You should be in control of that remote server so that you can ensure that it is able to handle the request.

The model will be sent to the specified HTTP server via a
[POST](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/POST) request.
The body of the POST is in the `multipart/form-data` format and consists of two files

 1. A text JSON file named `model.json`, which carries the topology and reference to the weights file described below.
  2. A binary file carrying the weight values named `model.weights.bin`.

Note that name of the two files will always be exactly as specified above. This [api doc](https://js.tensorflow.org/api/latest/#tf.io.browserHTTPRequest) contains a Python code snippet that demonstrates how one may use the [flask](http://flask.pocoo.org/) web framework to handle the request originated from `save`.

Often you will have to pass more arguments or request headers to your HTTP server (e.g. for authentication or if you want to specify a folder that the model should be saved in). You can gain fine-grained control over
these aspects of the requests from `save` by replacing the URL string argument a `tf.io.browserHTTPRequest`. This API
affords greater flexiblity in controlling HTTP requests.

For example:

```js
await model.save(tf.io.browserHTTPRequest(
    'http://model-server.domain/upload',
    {method: 'PUT', headers: {'header_key_1': 'header_value_1'}}));
```


