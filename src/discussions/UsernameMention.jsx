import React, { useState, useRef, useCallback, useEffect } from 'react';

const UsernameSuggestions = ({ suggestions, onSelectUsername, onClose }) => {
  if (!suggestions.length) return null;

  return (
    <div
      className="username-suggestions position-absolute bg-white border rounded shadow-sm"
      style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}
    >
      {suggestions.map((user) => (
        <button
          key={user.username}
          type="button"
          className="btn btn-link text-left w-100 px-3 py-2 border-0"
          onClick={() => onSelectUsername(user.username)}
        >
          {user.username}
        </button>
      ))}
    </div>
  );
};

const UsernameMention = ({ editor, authClient, getConfig }) => {
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const mentionSearchTimeoutRef = useRef(null);
  const [resolvedEditor, setResolvedEditor] = useState(editor || null);

  // Attempt to resolve TinyMCE editor instance if not provided or null
  useEffect(() => {
    if (editor) {
      setResolvedEditor(editor);
      return undefined;
    }

    let attempts = 0;
    const maxAttempts = 25; // ~5s at 200ms
    const intervalId = setInterval(() => {
      attempts += 1;
      const maybeTinyMCE = typeof window !== 'undefined' ? window.tinymce : null;
      const active = maybeTinyMCE?.activeEditor || maybeTinyMCE?.editors?.[0];
      if (active) {
        setResolvedEditor(active);
        clearInterval(intervalId);
      } else if (attempts >= maxAttempts) {
        clearInterval(intervalId);
      }
    }, 200);

    return () => clearInterval(intervalId);
  }, [editor]);

  const searchUsers = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setUserSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const { data } = await authClient().get(
        `${getConfig().LMS_BASE_URL}/messenger/api/v0/user/?search=${encodeURIComponent(query)}`
      );

      setUserSuggestions(data?.results || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching users:', error);
      setUserSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const handleUsernameSelect = useCallback(
    (username) => {
      if (!resolvedEditor) return;
      
      const rng = resolvedEditor.selection.getRng();
      const container = rng.startContainer;
      const offset = rng.startOffset;

      // Only handle when we're inside a text node
      const text = container && container.nodeType === Node.TEXT_NODE ? container.data : null;

      if (!text) {
        setShowSuggestions(false);
        setUserSuggestions([]);
        return;
      }

      const beforeCursor = text.slice(0, offset);
      const atIndexInNode = beforeCursor.lastIndexOf('@');
      if (atIndexInNode === -1) {
        setShowSuggestions(false);
        setUserSuggestions([]);
        return;
      }

      // Replace from '@' to cursor with the selected username
      const doc = container.ownerDocument;
      const replaceRange = doc.createRange();
      replaceRange.setStart(container, atIndexInNode);
      replaceRange.setEnd(container, offset);
      resolvedEditor.selection.setRng(replaceRange);
      resolvedEditor.insertContent(`@${username}&nbsp;`);

      setShowSuggestions(false);
      setUserSuggestions([]);
    },
    [resolvedEditor]
  );

  useEffect(() => {
    if (!resolvedEditor) return undefined;

    const keyupHandler = () => {
      clearTimeout(mentionSearchTimeoutRef.current);

      mentionSearchTimeoutRef.current = setTimeout(() => {
        const rng = resolvedEditor.selection.getRng();
        const container = rng?.startContainer;
        const offset = rng?.startOffset ?? 0;
        const text = container && container.nodeType === Node.TEXT_NODE ? container.data : '';

        if (!text) {
          setShowSuggestions(false);
          return;
        }

        const beforeCursor = text.slice(0, offset);
        const atIndexInNode = beforeCursor.lastIndexOf('@');

        if (atIndexInNode !== -1) {
          const mentionQuery = beforeCursor.slice(atIndexInNode + 1).trim();
          if (mentionQuery && !mentionQuery.includes(' ')) {
            searchUsers(mentionQuery);
          } else {
            setShowSuggestions(false);
          }
        } else {
          setShowSuggestions(false);
        }
      }, 300);
    };

    const blurHandler = () => {
      setTimeout(() => setShowSuggestions(false), 200);
    };

    resolvedEditor.on('keyup', keyupHandler);
    resolvedEditor.on('blur', blurHandler);

    return () => {
      if (resolvedEditor) {
        resolvedEditor.off('keyup', keyupHandler);
        resolvedEditor.off('blur', blurHandler);
      }
      clearTimeout(mentionSearchTimeoutRef.current);
    };
  }, [resolvedEditor, searchUsers]);

  return (
    <>
      {showSuggestions && (
        <UsernameSuggestions
          suggestions={userSuggestions}
          onSelectUsername={handleUsernameSelect}
          onClose={() => setShowSuggestions(false)}
        />
      )}
    </>
  );
};

export default UsernameMention;
