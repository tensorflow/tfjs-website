---
title: how-to-get-started
date: 2018-09-18 16:28:23
---

# How to get started with X: a guide for TensorFlow.js Users

Doing machine learning with TensorFlow.js requires knowledge of a number of different domains, in particular: machine learning and neural networks, JavaScript, and either Node.JS or browser-based development. Depending on your background you may not be familiar with one or more of these areas. There are lots of great learning resources on the web, and we hope this guide can be a starting point for you in supplementing your knowledge in these areas.

## Table of Contents

- [How to get started with Machine Learning](#ml)
  - [TensorFlow.js Focused](#ml-tfjs)
  - [Comprehensive Resources](#ml-comprehensive)
  - [Math Concepts](#ml-math)
  - [Other Tools](#ml-other)
- [How to get started with JavaScript (the programming language)](#js)
- [How to get started with Browser Based Development](#browser)
- [How to get started with Node.JS Development](#node)
- [How to get started with Contributing to TensorFlow.js](#contrib)
  - [Contributing to source code](#contrib-source)
  - [Creating learning resources and blog posts](#contrib-learning)

## <a name="ml"></a> How to get started with <strong>Machine Learning</strong>

TensorFlow.js is a tool that provides building blocks for building deep neural networks. However the fields of machine learning (ML) and deep learning (DL) are vast. If you want to write your own models or tweak existing ones, it is useful to gain a working knowledge of core concepts and techniques from the field of machine learning.

A great high level introduction to neural networks to get started with is Neural Networks by 3blue1brown.

### <a name="ml-tfjs"></a> TensorFlow.js Focused

These resources focus on TensorFlow.js and are also focused on beginners to machine learning.

- [TensorFlow.js: Intelligence and Learning Series](https://www.youtube.com/playlist?list=PLRqwX-V7Uu6YIeVA3dNxbR9PYj4wV31oQ) by Coding Train [Video]
- [TensorFlow.js: Color Classifier](https://www.youtube.com/playlist?list=PLRqwX-V7Uu6bmMRCIoTi72aNWHo7epX4L) by Coding Train [Video]
- [TensorFlow.js Deep Learning with JavaScript](https://www.youtube.com/playlist?list=PLZbbT5o_s2xr83l8w44N_g3pygvajLrJ-) by Deeplizard [Video]

### <a name="ml-comprehensive"></a> Comprehensive Resources

These are fairly comprehensive online courses that cover a large amount of machine learning and deep learning material. However the reality is that at this point in time most courses use Python as the primary language of instruction. However the concepts do translate to using TensorFlow.js even if the syntax doesn’t.

- [Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course/ml-intro) by Google	[Video] [Online coding exercises (Python)]
- [Deep Learning Specialization](https://www.coursera.org/specializations/deep-learning) by Coursera [Video]
- [Neural Networks and Deep Learning](http://neuralnetworksanddeeplearning.com/) by Michael Nielsen [Online Book]
- [Deep Learning with Python](https://www.manning.com/books/deep-learning-with-python) by Francois Chollet [Book]
- [CS231n: Convolutional Neural Networks for Visual Recognition](http://cs231n.stanford.edu/) by Stanford [Video] [Slides]
- [Hands-on Machine Learning with Scikit-Learn and TensorFlow](http://shop.oreilly.com/product/0636920052289.do) by Aurélien Géron [Book]

### <a name="ml-math"></a> Math Concepts

Machine Learning is a math heavy discipline, and while it is not necessary to understand the math if you are just using machine learning models, if you plan to modify machine learning models or build new ones from scratch, familiarity with the underlying math concepts can be helpful.

- [Essence of Calculus](https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr) by 3blue1brown [Video]
- [Essence of Linear Algebra](https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab) by 3blue1brown  [Video]
- [Linear Algebra](https://www.khanacademy.org/math/linear-algebra) by Khan Academy [Video]
- [Calculus](https://www.khanacademy.org/math/calculus-home) by Khan Academy [Video]

### <a name="ml-other"></a> Other Tools

If you are just getting started and find TensorFlow.js a bit overwhelming but still want to experiment with machine learning in the browser, you may be interested in checking out the following resources:

- [ML5](https://ml5js.org/) is a library built on top of TensorFlow.js that provides a higher level API to machine learning algorithms in the browser.
- [tfjs-models](https://github.com/tensorflow/tfjs-models) is a small but growing collection of pre-trained models with straightforward APIs to perform various tasks. These allow you to treat the machine learning aspect completely as a black box.

## <a name="js"></a> How to get started with <strong>JavaScript (the programming language)</strong>

If you are new to Javascript, these resources are good places to start if you need an overview or tutorial on the language itself.

- [Mozilla JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript) by Mozilla [Website]
- [Eloquent JavaScript](http://eloquentjavascript.net/) by Marijn Haverbeke  [Online Book]
- [The Modern JavaScript Tutorial](https://javascript.info/) by Ilya Kantor [Website]

## <a name="browser"></a>How to get started with <strong>Browser Based Development</strong>

If you are using TensorFlow.js in the browser it will be helpful to know a few things about browser development and the DOM.

- [Getting started with Web Development](https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web) by Mozilla [Website]
- [Modern Javascript Developers for Dinosaurs](https://medium.com/the-node-js-collection/modern-javascript-explained-for-dinosaurs-f695e9747b70) by Peter Jang:
This introduces some of the tooling used in modern web development workflows, such as package managers like npm and yarn and transpilers like babel. [Blog post]

## <a name="node"></a>How to get started with <strong>Node.JS Development</strong>

If you are using Tensorflow.js in Node.js, these resources introduce concepts more related to server side programming. You should already be familiar with JavaScript as a language.

- [Node.js Guides](https://nodejs.org/en/docs/guides/) by Node.js [Website]
- [Mixu’s Node Book](http://book.mixu.net/node/single.html) by Mixu [Online book]

## <a name="contrib"></a>How to get started with <strong>Contributing to TensorFlow.js</strong>

There are lots of different ways to contribute to TensorFlow.js. The first thing to think of is what kind of contribution are you interested in making:

### <a name="contrib-source"></a>Contributing to source code

Source code contributions don’t have to be complex. Improvements to documentation, error messages and tests are very welcome and require varying levels of knowledge of how the library works. One thing common to all contributions is learning how GitHub works as that is how we manage TensorFlow.js projects. If you want to make code contributions, familiarity with TypeScript will be necessary.

- [GitHub Hello World](https://guides.github.com/activities/hello-world/) by GitHub
- [Github Intro to Forking Projects](https://guides.github.com/activities/forking/) by GitHub
- [TensorFlow.js Contributors Guide](https://github.com/tensorflow/tfjs/blob/master/CONTRIBUTING.md) by the TensorFlow.js team
- [TypeScript Documentation](https://www.typescriptlang.org/docs/home.html) by Microsoft

### <a name="contrib-learning"></a>Creating learning resources and blog posts

Another great contribution is learning resources like blog posts and open source examples that others can read and learn from. If you have made something you think others might find useful, feel free to share it on the [TensorFlow.js Community Mailing List](https://groups.google.com/a/tensorflow.org/forum/#!forum/tfjs). We also maintain a [list of community projects here](https://github.com/tensorflow/tfjs/blob/master/GALLERY.md).
