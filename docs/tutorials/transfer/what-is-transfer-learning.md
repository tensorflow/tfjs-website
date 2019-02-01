# What is transfer learning?

Sophisticated deep learning models have millions of parameters and training them from scratch often requires large amounts of data of computing resources. Transfer learning is a technique that shortcuts much of this by taking a piece of a model that has already been trained on a related task and reusing it in a new model.

For example, the next tutorial in this section will show you how to build your own image recognizer that takes advantage of a model that was already trained to recognize 1000s or different kinds of objects within images. You can adapt the existing knowledge in the pre-trained model to detect your own image classes with much less training data than the original model required!

This is very useful for rapidly developing new models as well as customizing models in resource contstrained environments like browsers and mobile devices.

Most often when doing transfer learning, we don't actually adjust the weights of the original model. Instead we remove the final layer and train a new (often fairly shallow) model on top of the output from the new truncated model. This is the technique you will see demonstrated in the tutorials in this section.
