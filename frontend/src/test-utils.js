import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

function render(ui) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return { container, unmount: () => root.unmount() };
}

function matchText(node, matcher) {
  const text = node.textContent || '';
  if (typeof matcher === 'string') {
    return text.includes(matcher);
  }
  if (matcher instanceof RegExp) {
    return matcher.test(text);
  }
  return false;
}

function getByText(matcher) {
  const elements = Array.from(document.body.querySelectorAll('*'));
  const el = elements.find(e => matchText(e, matcher));
  if (!el) {
    throw new Error(`Unable to find element with text: ${matcher}`);
  }
  return el;
}

function getByLabelText(matcher) {
  const labels = Array.from(document.body.querySelectorAll('label'));
  const label = labels.find(l => matchText(l, matcher));
  if (!label) {
    throw new Error(`Unable to find label: ${matcher}`);
  }
  if (label.htmlFor) {
    const input = document.getElementById(label.htmlFor);
    if (input) return input;
  }
  if (label.control) {
    return label.control;
  }
  const nested = label.querySelector('input,textarea,select');
  if (nested) return nested;
  const parent = label.parentElement;
  if (parent) {
    const input = parent.querySelector('input,textarea,select');
    if (input) return input;
  }
  throw new Error(`Label ${matcher} has no associated control`);
}

function getByRole(role, { name } = {}) {
  const elements = Array.from(document.body.querySelectorAll('*'));
  const el = elements.find(e => {
    if (role === 'link' && e.tagName === 'A') {
      return name ? matchText(e, name) : true;
    }
    return false;
  });
  if (!el) {
    throw new Error(`Unable to find role ${role} with name ${name}`);
  }
  return el;
}

async function waitFor(callback, { timeout = 1000, interval = 50 } = {}) {
  const start = Date.now();
  while (true) {
    try {
      callback();
      return;
    } catch (err) {
      if (Date.now() - start > timeout) {
        throw err;
      }
      await new Promise(res => setTimeout(res, interval));
    }
  }
}

async function findByText(matcher) {
  await waitFor(() => getByText(matcher));
  return getByText(matcher);
}

const screen = { getByText, getByLabelText, getByRole, findByText };

const fireEvent = {
  click(node) {
    act(() => {
      node.click();
    });
  },
  change(node, { target }) {
    act(() => {
      node.value = target.value;
      const event = new Event('input', { bubbles: true, cancelable: true });
      node.dispatchEvent(event);
    });
  }
};

export { render, screen, fireEvent, waitFor };
