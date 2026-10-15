import React from 'react';
import {
  act, fireEvent, render, screen,
} from '@testing-library/react';

import UsernameMention, { getCourseIdFromPath } from './UsernameMention';

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

const COURSE_ID = 'course-v1:Org+Num+Run';
const getConfig = () => ({ LMS_BASE_URL: 'http://lms' });

const typeMention = (editor) => {
  act(() => {
    editor.handlers.keyup();
    jest.advanceTimersByTime(300);
  });
};

describe('getCourseIdFromPath', () => {
  it.each([
    [`/discussions/${COURSE_ID}/posts`, COURSE_ID],
    [`/discussions/${COURSE_ID}`, COURSE_ID],
    ['/discussions/course-v1%3AOrg%2BNum%2BRun/topics', COURSE_ID],
    ['/discussions/', null],
    ['', null],
  ])('%s', (pathname, expected) => {
    expect(getCourseIdFromPath(pathname)).toBe(expected);
  });
});

describe('UsernameMention', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.history.pushState({}, '', `/discussions/${COURSE_ID}/posts`);
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
    const get = jest.fn().mockResolvedValue({ data: { results: [{ username }] } });

    render(<UsernameMention editor={editor} authClient={() => ({ get })} getConfig={getConfig} />);

    typeMention(editor);
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

  it('only searches the members of the current course', async () => {
    const editor = createEditor('Hi @Ja');
    const get = jest.fn().mockResolvedValue({ data: { results: [] } });

    render(<UsernameMention editor={editor} authClient={() => ({ get })} getConfig={getConfig} />);
    typeMention(editor);

    expect(get).toHaveBeenCalledWith(
      `http://lms/wikimedia_general/api/v0/mention_users/${encodeURIComponent(COURSE_ID)}/?search=Ja`,
    );
  });

  it('does not search outside of a course', () => {
    window.history.pushState({}, '', '/discussions/');
    const editor = createEditor('Hi @Ja');
    const get = jest.fn();

    render(<UsernameMention editor={editor} authClient={() => ({ get })} getConfig={getConfig} />);
    typeMention(editor);

    expect(get).not.toHaveBeenCalled();
  });
});
