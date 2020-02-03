import { SCOPED_RUNNER } from '../types';
import { marathonObject, isString } from '../utils';

import { createRunner } from './base-runner';

/**
 * @typedef {function(*): MarathonObject} RunnerFunction
 *
 * Creates a combined runner of individual runners sharing the same implementation, but scoped to a different element.<br/>
 * This is useful to create component-like runners.
 *
 * @kind function
 * @memberof module:Marathon
 * @instance
 * @name createScopedRunner
 *
 * @param {string} name - The name of the runner
 * @param {string|NodeList|Array.<HTMLElement>} scope - The scope of the runner
 * @param {function} implementation - An arrow function containing the implementation of the runner
 *
 * @example <caption>HTML</caption>
 * <button class="alert-button" data-text="This is the alert text">Click me</button>
 * <button class="alert-button" data-text="This is another alert">No, click me instead!</button>
 *
 * @example <caption>JS</caption>
 * import { createScopedRunner } from '@mashvp/marathon';
 *
 * const alertButton = createScopedRunner('AlertButton', '.alert-button', ({ scope }, { bind }) => {
 *   const register = () => {
 *     const text = scope.getAttribute('data-text');
 *
 *     // Use the `bind` builtin to add event listeners to elements.
 *     // The listeners will be automatically unbound when the runner is unregistered.
 *     bind(scope, 'click', () => {
 *       alert(text);
 *     });
 *   };
 *
 *   return { register };
 * });
 *
 * @returns {RunnerFunction}
 */
export const createScopedRunner = (name, scope, implementation) => globals => {
  const elements = isString(scope)
    ? [...document.querySelectorAll(scope)]
    : [...scope];

  const instances = elements.map((element, index) => {
    const runner = createRunner(
      `ScopedRunner__${name}--${index + 1}`,
      implementation
    );

    return runner({ ...globals, scope: element });
  });

  const register = () => {
    instances.forEach(instance => instance.register());
  };

  const unregister = () => {
    instances.forEach(instance => instance.unregister());
  };

  return marathonObject(SCOPED_RUNNER, {
    name: 'ScopedRunner',
    register,
    unregister
  });
};
