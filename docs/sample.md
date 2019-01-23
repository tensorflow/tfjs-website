# Sample document

This is a sample document.

## Heading 2

### Heading 3

[An internal link](/js/tutorials/mnist)

[An external link](https://js.tensorflow.org)

An image

![image of graph with 2d points and learned curve](/js/images/fit_curve_learned.png)

### Code blocks

```html
<p>should show as code</p>
```

```js
import * as tf from '@tensorflow/tfjs'

function predict(input)  {
  return tf.tidy(() => {
    tf.tensor(input).square();
  });
}

predict(2);
```
