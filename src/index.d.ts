// TODO:

export interface RunnerInstance {
  name: string,
  register: () => void,
  unregister: () => void
}

export type RunnerImplementation = (globals: Object, builtins: Object) => RunnerInstance;

export type RunnerFunction = () => RunnerInstance;

export function createRunner(
  name: string,
  implementation: RunnerImplementation
): RunnerFunction;
