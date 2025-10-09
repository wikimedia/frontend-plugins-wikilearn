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

  const searchUsers = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setUserSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const { data } = await authClient().get(
        `${getConfig().LMS_BASE_URL}/ping_mention/user/?search=${encodeURIComponent(query)}`
      );

      setUserSuggestions(data?.results || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching users:', error);
      setUserSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);


  const handleUsernameSelect = useCallback((username) => {
    if (!editor) return;
    const content = editor.getContent({ format: 'text' });
    const selection = editor.selection.getRng();
    const cursorPosition = selection.startOffset;

    const lastAtIndex = content.substring(0, cursorPosition).lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const beforeAt = content.substring(0, lastAtIndex + 1);
      const afterCursor = content.substring(cursorPosition);
      const newContent = beforeAt + username + ' ' + afterCursor;
      editor.setContent(newContent);
    }

    setShowSuggestions(false);
    setUserSuggestions([]);
  }, []);

  useEffect(() => {
    if (!editor) return undefined;

    const keyupHandler = () => {
      clearTimeout(mentionSearchTimeoutRef.current);

      mentionSearchTimeoutRef.current = setTimeout(() => {
        const content = editor.getContent({ format: 'text' });
        const selection = editor.selection.getRng();
        const cursorPosition = selection.startOffset;
        const lastAtIndex = content.substring(0, cursorPosition).lastIndexOf('@');

        if (lastAtIndex !== -1) {
          const mentionQuery = content.substring(lastAtIndex + 1, cursorPosition).trim();

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

    editor.on('keyup', keyupHandler);
    editor.on('blur', blurHandler);

    return () => {
      if (editor) {
        editor.off('keyup', keyupHandler);
        editor.off('blur', blurHandler);
      }
      clearTimeout(mentionSearchTimeoutRef.current);
    };
  }, [editor, searchUsers]);

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
