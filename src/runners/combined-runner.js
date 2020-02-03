import { COMBINED_RUNNER, ROOT_RUNNER } from '../types';
import { isMarathonObject, marathonObject, isMarathonType } from '../utils';

/**
 * @typedef {function(*): MarathonObject} RunnerFunction
 *
 * Creates a single runner from multiple runners.
 *
 * @kind function
 * @memberof module:Marathon
 * @instance
 * @name combineRunners
 *
 * @param  {...RunnerFunction} runners
 *
 * @example
 * import { createRunner, combineRunners } from '@mashvp/marathon';
 *
 * const firstRunner = createRunner(...);
 * const secondRunner = createRunner(...);
 *
 * const combinedRunner = combineRunners(firstRunner, secondRunner);
 *
 * @returns {RunnerFunction}
 */
export const combineRunners = (...runners) => globals => {
  const instances = [];

  const register = () => {
    runners.forEach(runner => {
      let instance;

      if (isMarathonType(runner, ROOT_RUNNER)) {
        throw new Error(
          'Trying to combine a root runner. [ ie. combineRoot(combineRoot()) ]\n\tUse #combineRunners to join runners together. Only use #combineRoot for your root application runner.'
        );
      }

      try {
        instance = runner(globals);
      } catch (err) {
        throw new Error(`Error while generating runner instance: ${err}`);
      }

      if (!isMarathonObject(instance)) {
        throw new Error(
          'In combineRunners: Runner did not return a valid instance.'
        );
      }

      instances.push(instance);
      instance.register();
    });
  };

  const unregister = () => {
    instances.forEach(instance => {
      instance.unregister();
    });

    instances.splice(0, instances.length);
  };

  return marathonObject(COMBINED_RUNNER, {
    name: 'CombinedRunner',
    register,
    unregister
  });
};
