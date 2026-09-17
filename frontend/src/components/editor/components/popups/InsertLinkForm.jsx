import { useState } from 'react';
import { placeCaretAfter, isSafeUrl } from '../../core/domUtils';

// Also handles editing an existing link (opened from LinkTools, passing
// `existingLink`) — previously the only option was insert-a-new-one, so
// changing a link's URL/text or removing it meant deleting and retyping.
export default function InsertLinkForm({ editor, onClose, existingLink }) {
  const isEditing = !!existingLink;
  const savedRange = editor.selection.get();
  const hasSelection = savedRange && !savedRange.collapsed;
  const [url, setUrl] = useState(isEditing ? existingLink.getAttribute('href') || '' : 'https://');
  const [text, setText] = useState(isEditing ? existingLink.textContent : '');
  const [newTab, setNewTab] = useState(isEditing ? existingLink.target === '_blank' : true);
  const [error, setError] = useState('');

  const insertInto = (range, a) => {
    try {
      range.surroundContents(a);
    } catch {
      const contents = range.extractContents();
      a.appendChild(contents);
      range.insertNode(a);
    }
  };

  const applyTarget = (a) => {
    if (newTab) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    } else {
      a.removeAttribute('target');
      a.removeAttribute('rel');
    }
  };

  const handleRemove = () => {
    const parent = existingLink.parentNode;
    if (!parent) return;
    while (existingLink.firstChild) parent.insertBefore(existingLink.firstChild, existingLink);
    parent.removeChild(existingLink);
    editor.onInput();
    onClose();
  };

  const handleInsert = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    if (!isSafeUrl(trimmedUrl)) {
      setError('That link type isn\u2019t allowed. Use a web (https://), mailto:, or tel: address.');
      return;
    }

    if (isEditing) {
      existingLink.href = trimmedUrl;
      applyTarget(existingLink);
      const trimmedText = text.trim();
      if (trimmedText) existingLink.textContent = trimmedText;
      editor.onInput();
      onClose();
      return;
    }

    editor.selection.restore();
    const a = document.createElement('a');
    a.href = trimmedUrl;
    applyTarget(a);
    const range = editor.selection.get();
    if (range && !range.collapsed) {
      insertInto(range, a);
    } else {
      a.textContent = text.trim() || trimmedUrl;
      range?.insertNode(a);
    }
    // Land the caret right after the link instead of leaving the whole
    // thing selected, so continuing to type doesn't wipe it out again.
    placeCaretAfter(editor, a);
    editor.onInput();
    onClose();
  };

  return (
    <div>
      <h3 className="jc-form-title">{isEditing ? 'Edit link' : 'Insert link'}</h3>
      <div className="jc-form-field">
        <label htmlFor="jc-link-url">URL</label>
        <input
          id="jc-link-url"
          type="url"
          className={error ? 'jc-input-error' : ''}
          value={url}
          onChange={(e) => { setUrl(e.target.value); if (error) setError(''); }}
          autoFocus
        />
        {error && <div className="jc-form-error">{error}</div>}
      </div>
      {(!hasSelection || isEditing) && (
        <div className="jc-form-field">
          <label htmlFor="jc-link-text">Text</label>
          <input id="jc-link-text" type="text" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
      )}
      <label className="jc-form-checkbox">
        <input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} />
        Open in new tab
      </label>
      <div className="jc-form-actions">
        {isEditing && <button type="button" className="jc-btn-secondary" onClick={handleRemove}>Remove link</button>}
        <button type="button" className="jc-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="jc-btn-primary" onClick={handleInsert}>{isEditing ? 'Save' : 'Insert'}</button>
      </div>
    </div>
  );
}
