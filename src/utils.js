import { escape } from 'lodash';

/**
 * @kind typedef
 * @memberof module:Marathon
 * @name MarathonObject
 * @typedef {object} MarathonObject
 *
 * @property {string} name - The name of the object
 * @property {function} register - The register function
 * @property {function} unregister - The unregister function
 */
export const marathonObject = (type, obj) => ({ __marathon: { type }, ...obj });

export const isMarathonObject = obj => obj && obj.__marathon;

export const isMarathonType = (obj, type) =>
  isMarathonObject(obj) && obj.__marathon.type === type;

export const RunnerState = {
  UNREGISTERED: 'UNREGISTERED',
  REGISTERED: 'REGISTERED'
};

export const isNullOrUndefined = value => value == undefined;

export const isString = value =>
  !isNullOrUndefined(value) &&
  value.constructor.name.toLowerCase() === 'string';

export const generateUUID = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c == 'x' ? r : (r & 0x3) | 0x8;

    return v.toString(16);
  });

export const isTaggedStringValue = value => value && value.__taggedString;

export const createTaggedTemplateString = (
  separator,
  { escapeString = false, tag = null }
) => (strings, ...values) => {
  const rawResult = strings
    .map((string, i) => {
      const rawValue = isNullOrUndefined(values[i]) ? '' : values[i];

      if (isTaggedStringValue(rawValue)) {
        const taggedString = rawValue.string;
        let finalValue = taggedString;

        if (rawValue.escapeString) {
          finalValue = escape(finalValue);
        }

        return string + finalValue;
      } else {
        const escapedValue = escapeString ? escape(rawValue) : rawValue;

        return string + escapedValue;
      }
    })
    .join('')
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length)
    .join(separator);

  if (tag) {
    const { name, ...rest } = tag;

    return {
      __taggedString: true,
      name,
      ...rest,
      string: rawResult,

      same(other) {
        if (!other || !other.__taggedString) {
          return false;
        }

        if (!other.name === 'css') {
          return false;
        }

        return this.string.localeCompare(other.string) === 0;
      }
    };
  }

  return rawResult;
};

export const css = createTaggedTemplateString(' ', {
  escapeString: false,
  tag: { name: 'css', escapeString: false }
});

export const html = createTaggedTemplateString(' ', {
  escapeString: true,
  tag: {
    name: 'html',
    escapeString: true,
    toFragment() {
      const container = document.createElement('div');

      container.innerHTML = this.string;
      return container.children;
    }
  }
});

export const registerComponentElement = () => {
  if (!customElements.get('marathon-component')) {
    customElements.define(
      'marathon-component',

      // This class does not do anything.
      // It is only defined so that the custom element is properly registered and its usage is valid.
      class MarathonComponentDummy extends HTMLElement {
        constructor() {
          super();
        }
      }
    );
  }
};
