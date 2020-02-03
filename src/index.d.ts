//
// These are very basic types, probably incorrect
// but it should be enough for autocompletion for now
//

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

export function createScopedRunner(
  name: string,
  scope: string | HTMLCollection,
  implementation: RunnerImplementation,
): RunnerFunction;

export function createComponentRunner(
  name: string,
  implementation: RunnerImplementation
): RunnerFunction;

export function combineRunners(
  ...runners: Array<RunnerFunction>
): RunnerFunction;

export function combineRoot(
  ...runners: Array<RunnerFunction>
): RunnerInstance;

export interface TaggedStringObject {
  __taggedString: boolean,
  name: string,
  string: string,
  same: (other: TaggedStringObject) => boolean
};

export function css(
  strings: Array<string>,
  ...values: Array<any>
): TaggedStringObject | string;

export function html(
  strings: Array<string>,
  ...values: Array<any>
): TaggedStringObject | string;
