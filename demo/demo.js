import {
  createRunner,
  combineRoot,
  combineRunners,
  createScopedRunner,
  createComponentRunner
} from '../src';

import { css, html } from '../src/utils';

const BasicStaticRunner = createRunner(
  'BasicStaticRunner',
  ({ secretNumber }) => {
    const register = () => {
      console.info('BasicStaticRunner registered', secretNumber);
    };

    const unregister = () => {
      console.info('BasicStaticRunner unregistered');
    };

    return { register, unregister };
  }
);

const AlertButton = createScopedRunner(
  'AlertButton',
  '.alert-button',
  ({ scope, secretNumber }, { bind }) => {
    const register = () => {
      const text = scope.getAttribute('data-alert');

      bind(scope, 'click', () => {
        alert(`${text} ::: Global value: ${secretNumber}`);
      });
    };

    const unregister = () => {
      console.info('AlertButton unregistered');
    };

    return { register, unregister };
  }
);

const EchoField = createScopedRunner(
  'EchoField',
  '.echo-field',
  ({ scope, secretNumber }, { bind }) => {
    const register = () => {
      const input = scope.querySelector('input');

      bind(scope, 'submit', event => {
        event.preventDefault();

        alert(`${input.value} ::: Global value: ${secretNumber}`);

        return false;
      });
    };

    const unregister = () => {
      console.info('EchoField unregistered');
    };

    return { register, unregister };
  }
);

const ImagePreloader = createScopedRunner(
  'ImagePreloader',
  '.image-preloader',
  ({ scope }, { bind }) => {
    const previewSrc = scope.getAttribute('data-preview-src');
    const fullSrc = scope.getAttribute('data-full-src');

    const applyStyles = (element, options = {}) => {
      const opts = {
        blur: 0,
        z: 0,
        opacity: 1,
        duration: 0.75,
        delay: 0,
        ...options
      };

      element.style = css`
        position: absolute;
        width: calc(100% + ${opts.blur * 2}px);
        height: calc(100% + ${opts.blur * 2}px);
        transform-origin: center;
        transform: translate(${-opts.blur}px, ${-opts.blur}px);

        object-fit: cover;
        object-position: center;
        filter: blur(${opts.blur}px);
        opacity: ${opts.opacity};

        transition: opacity ${opts.duration}s ease;
        transition-delay: ${opts.delay}s;

        z-index: ${opts.z};
      `.string;
    };

    const register = () => {
      [...scope.children].forEach(child => scope.removeChild(child));

      scope.style.position = 'relative';
      scope.style.overflow = 'hidden';

      const preview = document.createElement('img');
      preview.src = previewSrc;

      applyStyles(preview, { blur: 10, delay: 0.75 });
      scope.appendChild(preview);

      bind(preview, 'load', () => {
        const full = document.createElement('img');

        full.src = fullSrc;

        applyStyles(full, { opacity: 0, z: 100 });
        scope.appendChild(full);

        bind(full, 'load', () => {
          full.style.opacity = 1;
        });
      });
    };

    return { register };
  }
);

const DemoComponent = createComponentRunner(
  'DemoComponent',
  (
    { secretNumber },
    { useState, getState, setState, useCallback, useTimeout }
  ) => {
    useState('text', secretNumber);

    useCallback('setText', event => {
      setState('text', event.target.value);
    });

    useCallback('alert', () => {
      const text = getState('text');

      alert(`You clicked the button! BTW the value is "${text}"`);
    });

    const globalStyles = document.getElementById('global-styles');

    const stylesheet = () => css`
      @import url('${globalStyles.getAttribute('href')}');
    `;

    const render = () => {
      const text = getState('text');
      const disabled = text ? '' : 'disabled';

      return html`
        <div class="line" data-custom="${text}">
          <input value="${text}" bind:input="setText" />
          <button bind:click="alert" ${disabled}>
            ${disabled ? 'Button is disabled' : 'Click me to alert'}
          </button>
        </div>
        <p>Paragraph element ::: ${text}</p>
        This is a bare text node with the current value: "${text}"
      `;
    };

    const register = () => {
      console.log('Component registered');

      useTimeout(() => {
        setState('text', 300);
      }, 3000);
    };

    return { register, render, stylesheet };
  }
);

const CursorComponent = createRunner('CursorComponent', ({}, { bind }) => {
  const cursor = html`
    <div class="cursor cursor--container">
      <div class="cursor cursor--circle"></div>
    </div>
  `
    .toFragment()
    .item(0);

  const register = () => {
    const circle = cursor.children[0];

    cursor.style = css`
      position: fixed;
      width: 0;
      height: 0;
      top: 0;
      left: 0;

      transform: translate(
        ${window.innerWidth / 2}px,
        ${window.innerHeight / 2}px
      );
      transition: transform 0.8s cubic-bezier(0.23, 1, 0.32, 1);

      mix-blend-mode: difference;

      pointer-events: none;
      z-index: 999;
    `.string;

    circle.style = css`
      display: block;
      position: absolute;
      top: calc(30px - 5px);
      left: calc(30px - 5px);
      width: 10px;
      height: 10px;

      background: white;
      transform-origin: center;
      transition: transform 1.75s cubic-bezier(0.23, 1, 0.32, 1);

      border-radius: 50%;
    `.string;

    document.body.appendChild(cursor);

    bind(document, 'mousemove', event => {
      const { clientX, clientY } = event;

      cursor.style.transform = `translate(${clientX}px, ${clientY}px)`;
    });

    bind(document, 'mousedown', () => {
      circle.style.transform = `scale(3)`;
    });

    bind(document, 'mouseup', () => {
      circle.style.transform = `scale(1)`;
    });
  };

  const unregister = () => {
    cursor.parentElement.removeChild(cursor);
  };

  return { register, unregister };
});

const Counter = createComponentRunner(
  'Counter',
  ({}, { useInterval, useState, getState, setState, useCallback }) => {
    useState('count', 0);

    useCallback('reset', event => {
      event.preventDefault();

      setState('count', 0);

      return false;
    });

    const stylesheet = () => {
      const count = getState('count');

      const r = Math.floor(105 + count * 8) % 256;
      const g = Math.floor(66 + count * 14) % 256;
      const b = Math.floor(204 + count * 18) % 256;

      return css`
        .container {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          position: relative;
          padding: 20px;
          margin: 0;

          background-color: rgba(${r}, ${g}, ${b}, 1);
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 5px;

          transition: background-color 1s linear;
        }

        p {
          margin: 0;
          padding: 5px 10px;

          background-color: white;
          border-radius: 5px;
          border: 1px solid rgba(0, 0, 0, 0.2);
        }

        a {
          display: inline-block;
          padding: 5px 10px;

          text-decoration: none;
          color: black;
          background-color: white;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 5px;
        }
      `;
    };

    const render = () => {
      const count = getState('count');

      return html`
        <div class="container">
          <p>
            This component has been mounted for ${count}
            second${count !== 1 ? 's' : ''}.
          </p>
          <a href="#" bind:click="reset">Reset count</a>
        </div>
      `;
    };

    const register = () => {
      useInterval(() => {
        const count = getState('count');

        setState('count', count + 1);
      }, 1000);
    };

    return { render, stylesheet, register };
  }
);

const CombinedComponents = combineRunners(
  AlertButton,
  EchoField,
  ImagePreloader,
  DemoComponent,
  CursorComponent,
  Counter
);

const RootRunner = combineRoot(BasicStaticRunner, CombinedComponents);

document.addEventListener('DOMContentLoaded', () => {
  const getRandomNumber = () => Math.round(Math.random() * 1000);

  RootRunner.register({ secretNumber: getRandomNumber() });

  const btnRegister = document.querySelector('button.register');
  const btnUnregister = document.querySelector('button.unregister');

  btnRegister.addEventListener('click', () => {
    console.log('!! REGISTER');
    RootRunner.register({ secretNumber: getRandomNumber() });
  });

  btnUnregister.addEventListener('click', () => {
    console.log('!! UNREGISTER');
    RootRunner.unregister();
  });
});
