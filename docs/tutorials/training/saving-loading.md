# Saving and Loading TensorFlow.js models

TensorFlow.js provides functionality for saving and loading models that have been created with
the [tf.layers](https://js.tensorflow.org/api/0.14.2/#Models) API. These can include models
you have trained yourself or that others have previously trained. A key benefit of using the
tf.layers api is that the models you create with it are serializable and that is what
we will explore in this tutorial.

This tutorial will focus on saving and loading TensorFlow.js models (primarily
represented byt JSON files). We can also import TensorFlow Python models.
Loading these models are covered in the following two tutorials:

  - [TODO] TK add link to Keras Model Importing tutorial
  - [TODO] TK add link to Python Graphdef Model Importing tutorial


## Saving tf.Model

[`tf.Model`](https://js.tensorflow.org/api/0.14.2/#class:Model) and [`tf.Sequential`](https://js.tensorflow.org/api/0.14.2/#class:Model)
both provide a function [`model.save`](https://js.tensorflow.org/api/0.14.2/#tf.Model.save) that allow you to save the
_topology_ and _weights_ of a model.



