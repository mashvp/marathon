import differenceBy from 'lodash/differenceBy';

import { COMPONENT_RUNNER } from '../types';
import { marathonObject, isString, RunnerState } from '../utils';

import { createRunner } from './base-runner';

export const ComponentLifecycle = {
  COMPONENT_WILL_MOUNT: 'componentWillMount',
  COMPONENT_DID_MOUNT: 'componentDidMount',

  COMPONENT_WILL_REGISTER: 'componentWillRegister',
  COMPONENT_DID_REGISTER: 'componentDidRegister',

  COMPONENT_WILL_RENDER: 'componentWillRender',
  COMPONENT_DID_RENDER: 'componentDidRender',

  COMPONENT_WILL_UPDATE: 'componentWillUpdate',
  COMPONENT_DID_UPDATE: 'componentDidUpdate',

  COMPONENT_WILL_GENERATE_STYLES: 'componentWillGenerateStyles',
  COMPONENT_DID_GENERATE_STYLES: 'componentDidGenerateStyles',

  COMPONENT_WILL_UNREGISTER: 'componentWillUnregister',
  COMPONENT_DID_UNREGISTER: 'componentDidUnregister',

  COMPONENT_WILL_UNMOUNT: 'componentWillUnmount',
  COMPONENT_DID_UNMOUNT: 'componentDidUnmount'
};

export const createComponentRunner = (name, implementation) => globals => {
  const elements = [
    ...document.querySelectorAll(`marathon-component[name="${name}"]`)
  ];

  const instances = elements.map((element, index) => {
    const runner = createRunner(
      `ComponentRuner__${name}--${index + 1}`,
      (globals, genericBuiltins) => {
        const implRunner = createRunner(
          `ComponentRunerImplementation__${name}--${index + 1}`,
          implementation
        );

        let shadow = null;
        let styleElement = null;
        let styleCache = null;

        const state = {};
        const callbacks = {};
        const binds = {};
        const refs = {};

        let instance;

        const doHook = (name, ...data) => {
          if (instance && instance[name]) {
            instance[name](...data);
          }
        };

        const applyDiffing = (rootElement, futureElement) => {
          if (futureElement.attributes) {
            const rootAttrs = [...rootElement.attributes];
            const futureElementAttrs = [...futureElement.attributes];

            differenceBy(
              rootAttrs,
              futureElementAttrs,
              'name'
            ).forEach(({ name }) => rootElement.removeAttribute(name));

            [...futureElement.attributes].forEach(({ name, value }) => {
              const match = name.match(/^bind:(.+)$/);

              if (!match && rootElement.getAttribute(name) !== value) {
                rootElement.setAttribute(name, value);

                if (name === 'value') {
                  rootElement.value = value;
                }
              }
            });
          }

          if (
            rootElement &&
            rootElement.childNodes.length &&
            futureElement &&
            futureElement.childNodes.length
          ) {
            [...futureElement.childNodes].forEach((shade, i) => {
              applyDiffing(rootElement.childNodes[i], shade);
            });
          } else {
            if (futureElement.nodeType === Node.TEXT_NODE) {
              if (futureElement.nodeValue !== rootElement.nodeValue) {
                rootElement.nodeValue = futureElement.nodeValue;
              }
            } else {
              if (futureElement.innerText !== rootElement.innerText) {
                rootElement.innerText = futureElement.innerText;
              }
            }
          }
        };

        const applyDiffingToChildNodes = (rootElement, futureElement) => {
          if (
            rootElement &&
            rootElement.childNodes.length &&
            futureElement &&
            futureElement.childNodes.length
          ) {
            const offset = rootElement.firstChild === styleElement ? 1 : 0;

            [...futureElement.childNodes].forEach((shade, i) => {
              applyDiffing(rootElement.childNodes[i + offset], shade);
            });
          }
        };

        const bindEvents = () => {
          [...shadow.querySelectorAll('*')].forEach(child => {
            binds[child] = {};

            [...child.attributes].forEach(({ name, value }) => {
              const match = name.match(/^bind:(.+)$/);

              if (match) {
                binds[child][match[1]] = value;

                child.addEventListener(match[1], callbacks[value]);
                child.removeAttribute(name);
              }
            });
          });
        };

        const consumeRefs = () => {
          [...shadow.querySelectorAll('*')].forEach(child => {
            [...child.attributes].forEach(({ name, value }) => {
              if (name === 'ref') {
                refs[value] = child;

                child.removeAttribute(name);
              }
            });
          });
        };

        const generateGlobalStyles = () => {
          if (instance.stylesheet) {
            doHook(ComponentLifecycle.COMPONENT_WILL_GENERATE_STYLES);

            const newStyles = instance.stylesheet();

            if (newStyles && newStyles.__taggedString) {
              if (newStyles.name === 'css') {
                if (styleCache && styleElement) {
                  if (!styleCache.same(newStyles)) {
                    styleCache = newStyles;
                    styleElement.textContent = newStyles.string;
                  }
                } else {
                  styleElement = document.createElement('style');
                  styleCache = newStyles;

                  styleElement.id = 'marathon:private-generated-styles';
                  styleElement.type = 'text/css';
                  styleElement.textContent = newStyles.string;

                  shadow.insertBefore(styleElement, shadow.firstChild);
                }
              } else {
                console.error(
                  `Marathon: ComponentRunner ${name} has a #styles method but returns a tagged string of the wrong type. (got '${newStyles.name}', expected 'css')`
                );
              }
            } else {
              console.error(
                `Marathon: ComponentRunner ${name} has a #styles method but does not return a tagged string.`
              );
            }

            doHook(ComponentLifecycle.COMPONENT_DID_GENERATE_STYLES);
          }
        };

        const renderComponent = ({ bypassRegisterCheck } = {}) => {
          if (
            !bypassRegisterCheck &&
            instance.getStatus() === RunnerState.UNREGISTERED
          ) {
            throw new Error(
              `Marathon: Cannot render component ${name}: Runner is unregistered.\nPlease make sure no async code is trying to update this component.`
            );
          }

          doHook(ComponentLifecycle.COMPONENT_WILL_RENDER);
          const renderedHTML = instance.render();

          if (!shadow.children.length) {
            doHook(ComponentLifecycle.COMPONENT_WILL_MOUNT, renderedHTML);
            shadow.innerHTML = renderedHTML.string;
            doHook(ComponentLifecycle.COMPONENT_DID_MOUNT);
          } else {
            doHook(ComponentLifecycle.COMPONENT_WILL_UPDATE, renderedHTML);

            const futureElement = document.createElement('slot');
            futureElement.innerHTML = renderedHTML.string;

            applyDiffingToChildNodes(shadow, futureElement);
            doHook(ComponentLifecycle.COMPONENT_DID_UPDATE);
          }

          bindEvents();
          consumeRefs();
          generateGlobalStyles();

          doHook(ComponentLifecycle.COMPONENT_DID_RENDER);
        };

        const builtins = {
          ...genericBuiltins,

          useState: (name, initialValue) => {
            state[name] = initialValue;
            return initialValue;
          },

          getState: name => state[name],

          setState: (name, value) => {
            state[name] = isString(value) ? unescape(value) : value;
            renderComponent();
          },

          useCallback: (name, callback) => {
            callbacks[name] = callback;
          },

          useRef: name => {
            refs[name] = null;
          },

          getRef: name => refs[name]
        };

        instance = implRunner({ ...globals, slot: element }, builtins);

        const createOrAttachShadow = () => {
          shadow = element.shadowRoot;

          if (!shadow) {
            shadow = element.attachShadow({ mode: 'open' });
          }
        };

        const register = () => {
          createOrAttachShadow();
          renderComponent({ bypassRegisterCheck: true });

          doHook(ComponentLifecycle.COMPONENT_WILL_REGISTER);
          instance.register();
          doHook(ComponentLifecycle.COMPONENT_DID_REGISTER);
        };

        const unregister = () => {
          doHook(ComponentLifecycle.COMPONENT_WILL_UNREGISTER);
          instance.unregister();
          doHook(ComponentLifecycle.COMPONENT_DID_UNREGISTER);

          doHook(ComponentLifecycle.COMPONENT_WILL_UNMOUNT);
          [...shadow.childNodes].forEach(child => shadow.removeChild(child));
          doHook(ComponentLifecycle.COMPONENT_DID_UNMOUNT);
        };

        return { register, unregister };
      }
    );

    return runner({ ...globals, slot: element });
  });

  const register = () => {
    instances.forEach(instance => instance.register());
  };

  const unregister = () => {
    instances.forEach(instance => instance.unregister());
  };

  return marathonObject(COMPONENT_RUNNER, {
    name,
    register,
    unregister
  });
};
