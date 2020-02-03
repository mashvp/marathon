import { RUNNER } from '../types';
import { RunnerState, marathonObject } from '../utils';

/**
 * @typedef {function(*): MarathonObject} RunnerFunction
 *
 * Creates a standard runner.
 *
 * @kind function
 * @memberof module:Marathon
 * @instance
 * @name createRunner
 *
 * @param {string} name - The name of the runner
 * @param {function} implementation - An arrow function containing the implementation of the runner
 *
 * @example
 * import { createRunner } from '@mashvp/marathon';
 *
 * const exampleRunner = createRunner('ExampleRunner', () => {
 *   const register = () => {
 *     console.log('ExampleRunner registered');
 *   };
 *
 *   // Returning an object with a #register function is mandatory.
 *   return { register };
 * });
 *
 * @returns {RunnerFunction}
 */
export const createRunner = (name, implementation) => (
  globals,
  otherBuiltins
) => {
  let __status = RunnerState.UNREGISTERED;

  const events = {};
  const timeouts = [];
  const intervals = [];

  const bind = (target, event, callback) => {
    if (!target.addEventListener) {
      return console.error(
        `Marathon: Cannot bind event '${event}': Target ${JSON.stringify(
          target
        )} (${typeof target}) does not respond to addEventListener.`
      );
    }

    if (!events[event]) {
      events[event] = [];
    }

    events[event].push({ target, callback });

    target.addEventListener(event, callback);
  };

  const unbind = (target, event) => {
    if (events[event]) {
      events[event]
        .filter(e => e.target === target)
        .forEach(e => e.target.removeEventListener(e.event, e.callback));
    }
  };

  const unbindAll = () => {
    Object.entries(events).forEach(([event, boundEvents]) => {
      boundEvents.forEach(({ target, callback }) => {
        target.removeEventListener(event, callback);
      });
    });
  };

  const useTimeout = (handler, timeout, ...args) => {
    const id = setTimeout(handler, timeout, ...args);

    timeouts.push(id);

    return id;
  };

  const clearAllTimeouts = () => timeouts.forEach(id => clearTimeout(id));

  const useInterval = (handler, timeout, ...args) => {
    const id = setInterval(handler, timeout, ...args);

    intervals.push(id);

    return id;
  };

  const clearAllIntervals = () => intervals.forEach(id => clearInterval(id));

  const runnerInstance = implementation(globals, {
    bind,
    unbind,
    unbindAll,
    useTimeout,
    clearAllTimeouts,
    useInterval,
    clearAllIntervals,
    ...otherBuiltins
  });

  return marathonObject(RUNNER, {
    name,
    ...runnerInstance,

    getStatus() {
      return __status;
    },

    register() {
      if (__status === RunnerState.REGISTERED) {
        console.error(`Marathon: Runner ${name}: Already registered.`);
      } else {
        if (runnerInstance && runnerInstance.register) {
          runnerInstance.register();
        } else {
          throw new Error(
            `Marathon: Runner '${name}' does not implement #register.`
          );
        }

        __status = RunnerState.REGISTERED;
      }
    },

    unregister() {
      if (__status === RunnerState.UNREGISTERED) {
        console.error(`Marathon: Runner ${name}: Already unregistered.`);
      } else {
        if (runnerInstance && runnerInstance.unregister) {
          runnerInstance.unregister();
        }

        unbindAll();
        clearAllTimeouts();
        clearAllIntervals();

        __status = RunnerState.UNREGISTERED;
      }
    }
  });
};
