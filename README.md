<h1 align="center">
  <span>Marathon</span>
  <span style="display:inline-block;transform:scaleX(-1)">🏃‍♀️</span>
</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.0-blue.svg?cacheSeconds=2592000" />
  <a href="/" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-yes-brightgreen.svg" />
  </a>
  <a href="LICENSE.md" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
  <a href="https://twitter.com/mashvp" target="_blank">
    <img alt="Twitter: mashvp" src="https://img.shields.io/twitter/follow/mashvp.svg?style=social" />
  </a>
</p>

> Marathon runner system for vanilla JavaScript

Marathon aims to simplify web JavaScript development thanks to separation of concern and a reducer-like single entry point. This eases the development of isolated, pure components (provided they are coded this way) and enables a basic, HTTP multi-page website to be turned into a single-page application with the use of libraries such as [Swup](https://swup.js.org/), [Barba.js](https://barba.js.org/), [InstantClick](http://instantclick.io/), [Turbolinks](https://github.com/turbolinks/turbolinks) and others, with very minimal code change.

## Install

```sh
yarn install @mashvp/marathon
```

## Usage

A Marathon application is composed of one or several *runners*, which are isolated units of code that should handle a single feature of your application.

Runners are pure functions, which must return an object containing a `register` and `unregister` function.
These functions are used in place of a constructor and destructor, in order to enable and disable the runner's features as required.
Runners should not depend on each-other, and should handle an isolated state. You can implement message passing between runners using a library such as [PubSub](https://sahadar.github.io/pubsub/). Generally speaking, runners should never be tightly coupled.

Runners can be joined together into a root runner, forming a tree structured application.

### Basic runner

A basic runner can be created with the `createRunner` function.

```js
import { createRunner } from '@mashvp/marathon';

// Runners are allowed to use external libraries
import SomeLibrary from 'some-library';

export default createRunner('MyRunner', ({ /* globals here */ }, { /* Builtins here */ }) => {
  const libraryInstance = new SomeLibrary();

  const register = () => {
    console.log('MyRunner was registered');
    libraryInstance.run();
  };

  const unregister = () => {
    console.log('MyRunner was unregistered');
    libraryInstance.stop();
  };

  return { register, unregister };
});
```

In the example above, the runner will log a message to the console when the application loads, and log another one when the application unloads.
The runner also sets up an instance of an imaginary library, and starts and stops it when relevant.

Please note that the `unregister` function is not required if it does not need to perform any action.

### Combined runner

You can use a combined runner to join together runners which handle similar features to simplify your application structure. The `createCombinedRunner` returns a runner which forwards calls to `register` and `unregister` to its children.

```js
import { createCombinedRunner } from '@mashvp/marathon';

import SomeRunner from './some-runner';
import OtherRunner from './other-runner';

export default createCombinedRunner(SomeRunner, OtherRunner);
```

### Scoped runners

Scoped runners are useful for implementing component-like features. For example, a modal system which could be found in multiple places in the website could be handled with a scoped runner. The `createScopedRunner` takes in a selector or list of elements along with the definition of the runner, creates a runner for each element, and returns of combined runner of them.

```html
<button class="alert-button" data-text="This is the alert text">Click me</button>
<button class="alert-button" data-text="This is another alert">No, click me instead!</button>
```

```js
import { createScopedRunner } from '@mashvp/marathon';

const alertButton = createScopedRunner(
  'AlertButton',
  '.alert-button',
  ({ scope }, { bind }) => {
    const register = () => {
      const text = scope.getAttribute('data-text');
      // Use the `bind` builtin to add event listeners to elements.
      // The listeners will be automatically unbound when the runner is unregistered.
      bind(scope, 'click', () => {
        alert(text);
      });
    };

    return { register };
  }
);
```

### Root runner

The root runner can be thought of as your application itself. It works much like a combined runner, except that it returns a runner instance which is ready to be used as is. The `combineRoot` function takes in your application runners the same way `createCombinedRunner` does.

You can then use the `register` function on your root runner to start the application, passing in any globals as required.

```js
import { combineRoot } from '@mashvp/marathon';
import Bowser from 'bowser';

import SomeRunner from './runners/some-runner';
import OtherRunner from './runners/other-runner';
import MobileRunners from './runners/mobile';

(() => {
  const browser = Bowser.getParser(window.navigator.userAgent);
  const rootRunner = combineRoot(SomeRunner, OtherRunner, MobileRunners);

  const init = () => {
    // Start the root runner on DOMContentLoaded, passing in browser info to the children
    rootRunner.register({ browser });
  };

  document.addEventListener('DOMContentLoaded', init);
})();
```

This structure allows to easily swap in a single-page AJAX library, such as [Swup](https://swup.js.org/), and make sure that no stray event listeners and such are still in place when transitioning between pages.

```js
import { combineRoot } from '@mashvp/marathon';
import Swup from 'swup';
import Bowser from 'bowser';

import SomeRunner from './runners/some-runner';
import OtherRunner from './runners/other-runner';
import MobileRunners from './runners/mobile';

(() => {
  const swup = new Swup(/* ... */);

  const browser = Bowser.getParser(window.navigator.userAgent);
  const rootRunner = combineRoot(SomeRunner, OtherRunner, MobileRunners);

  const init = () => {
    // Start the root runner on Swup contentReplaced, passing in browser info to the children
    rootRunner.register({ browser });
  };

  const unload = () => {
    // Stop and clear all runners before Swup page change
    rootRunner.unregister();
  };

  swup.on('contentReplaced', init);
  swup.on('willReplaceContent', unload);
})();
```

## Builtins

Marathon provides runners with a few builtin functions, which simplify handling event listeners between `register` and `unregister` calls.

### bind

This function works just like `addEventListener`, but listeners are cleared automatically when the runner unregisters.

```js
import { createRunner } from '@mashvp/marathon';

export default createRunner('ExampleRunner', ({ /* globals */ }, { bind }) => {
  const register = () => {
    const button = document.querySelector('button.example-runner');

    bind(button, 'click', () => {
      alert('The button was clicked');
    });
  };

  // No `unregister` is needed here since `bind` clears the event listener automatically
  return { register };
});
```

### unbind

This function works just like `removeEventListener`, but you don't need to give a reference to the original handler, since they are memorized.

Please note that `unbind` will remove all event listeners of a given type on an element.

```js
unbind(element, eventType);
```

### unbindAll

This function will unbind all events that were bound using `bind` on a given element.

```js
unbindAll(element);
```

## Author

👤 **Mashvp**

* Website: [mashvp.com](https://mashvp.com)
* Twitter: [@mashvp](https://twitter.com/mashvp)
* Github: [@mashvp](https://github.com/mashvp)
* LinkedIn: [@mashvp](https://www.linkedin.com/company/mashvp/)

## Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2019 [Mashvp](https://github.com/mashvp).<br />
This project is [MIT](LICENSE.md) licensed.
