/**
 * @module Marathon
 */

import { ROOT_RUNNER } from './types';
import { RunnerState, marathonObject, registerComponentElement } from './utils';

import { combineRunners } from './runners/combined-runner';

export * from './runners/base-runner';
export * from './runners/scoped-runner';
export * from './runners/combined-runner';
export * from './runners/component-runner';

export * from './utils';

/**
 * @typedef {function(*): MarathonObject} RunnerFunction
 *
 * Create a root application runner.<br/>
 * Only use this for the root application. If you want to group runners together, see #combineRunners.
 *
 * @kind function
 * @memberof module:Marathon
 * @instance
 * @name combineRoot
 *
 * @see {@link createRunner}
 * @see {@link createScopedRunner}
 * @see {@link combineRunners}
 *
 * @param {...RunnerFunction} runners - Runners created with calls to #createRunner, #createScopedRunner, or #combineRunners.
 *
 * @example
 * import { combineRoot } from '@mashvp/marathon';
 *
 * import someRunner from './some-runner';
 * import someCombinedRunner from './some-combined-runner';
 * import someScopedRunner from './some-scoped-runner';
 *
 * const rootRunner = combineRoot(someRunner, someCombinedRunner, someScopedRunner);
 *
 * document.addEventListener('DOMContentLoaded', () => {
 *   rootRunner.register({ someGlobalValue: 42 });
 * });
 *
 * @returns {MarathonObject}
 */
export const combineRoot = (...runners) => {
  const combinedRunner = combineRunners(...runners);

  let state = RunnerState.UNREGISTERED;
  let instance = null;

  const registerCurrentInstance = () => {
    try {
      instance.register();
    } catch (err) {
      console.error(
        `Marathon: Runner '${instance.name}' crashed while registering.\n\t${err}`
      );
    }

    state = RunnerState.REGISTERED;
  };

  const register = (globals = {}) => {
    if (state === RunnerState.REGISTERED) {
      throw new Error('Marathon: RootRunner: Already registered.');
    }

    registerComponentElement();

    if (instance) {
      return registerCurrentInstance();
    }

    instance = combinedRunner(globals);

    registerCurrentInstance();
  };

  /**
   * Unregisters the whole application runner tree.
   *
   * @param {boolean} [keepTree=false] - Keeps the runner tree intact. The next call to #register will reuse the previous tree. Note that globals will not be updated.
   */
  const unregister = (keepTree = false) => {
    instance.unregister();

    if (!keepTree) {
      instance = null;
    }

    state = RunnerState.UNREGISTERED;
  };

  return marathonObject(ROOT_RUNNER, {
    name: 'RootRunner',
    register,
    unregister
  });
};
