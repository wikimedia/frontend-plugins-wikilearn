import React from 'react';
import {
  act, fireEvent, render, screen,
} from '@testing-library/react';

import UsernameMention from './UsernameMention';

const ENTITIES = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};

// Minimal stand-in for a TinyMCE editor, with the cursor at the end of `text`.
const createEditor = (text) => {
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  const textNode = paragraph.firstChild;
  const range = document.createRange();
  range.setStart(textNode, text.length);
  const handlers = {};

  return {
    handlers,
    on: (name, handler) => { handlers[name] = handler; },
    off: jest.fn(),
    selection: {
      getRng: () => range,
      setRng: jest.fn(),
    },
    dom: {
      create: (tag, attrs, html) => {
        const element = document.createElement(tag);
        Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value));
        element.innerHTML = html;
        return element;
      },
      encode: (value) => value.replace(/[&<>"']/g, (char) => ENTITIES[char]),
      getOuterHTML: (element) => element.outerHTML,
    },
    insertContent: jest.fn(),
  };
};

describe('UsernameMention', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    'Jane Doe',
    "O'Brien",
    'Tom & "Jerry"',
  ])('inserts a mention that carries the exact username: %s', async (username) => {
    const editor = createEditor('Hi @Ja');
    const authClient = () => ({
      get: jest.fn().mockResolvedValue({ data: { results: [{ username }] } }),
    });
    const getConfig = () => ({ LMS_BASE_URL: 'http://lms' });

    render(<UsernameMention editor={editor} authClient={authClient} getConfig={getConfig} />);

    act(() => {
      editor.handlers.keyup();
      jest.advanceTimersByTime(300);
    });
    fireEvent.click(await screen.findByRole('button', { name: username }));

    expect(editor.insertContent).toHaveBeenCalledTimes(1);
    const html = editor.insertContent.mock.calls[0][0];
    expect(html.endsWith('&nbsp;')).toBe(true);

    const container = document.createElement('div');
    container.innerHTML = html;
    const mention = container.querySelector('span.wikilearn-mention');
    expect(mention.getAttribute('data-username')).toBe(username);
    expect(mention.getAttribute('contenteditable')).toBe('false');
    expect(mention.textContent).toBe(`@${username}`);
  });
});
