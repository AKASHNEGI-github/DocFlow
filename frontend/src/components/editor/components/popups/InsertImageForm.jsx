import { useState } from 'react';
import { placeCaretAfter, isSafeImageSrc } from '../../core/domUtils';

// Also handles editing an existing image (opened from MediaTools, passing
// `existingImage`) — previously the only option was insert-a-new-one, so
// changing an image's URL/alt text meant deleting it and starting over.
export default function InsertImageForm({ editor, onClose, existingImage }) {
  const isEditing = !!existingImage;
  const [url, setUrl] = useState(isEditing ? existingImage.getAttribute('src') || '' : '');
  const [alt, setAlt] = useState(isEditing ? existingImage.alt || '' : '');
  const [error, setError] = useState('');

  const handleInsert = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    if (!isSafeImageSrc(trimmedUrl)) {
      setError('That image address isn\u2019t allowed. Use a web (https://) URL.');
      return;
    }

    if (isEditing) {
      existingImage.src = trimmedUrl;
      existingImage.alt = alt.trim();
      editor.onInput();
      onClose();
      return;
    }

    editor.selection.restore();
    const img = document.createElement('img');
    img.src = trimmedUrl;
    img.alt = alt.trim();
    img.style.maxWidth = '100%';
    // Dragging is handled by MediaTools' own pointer-based move handle
    // instead — turning off the browser's native image drag keeps the
    // two mechanisms from fighting over the same mouse-down.
    img.draggable = false;
    const range = editor.selection.get();
    range?.collapse(false);
    range?.insertNode(img);
    // Land the caret right after the image instead of leaving it
    // selected, so continuing to type doesn't wipe it out again.
    placeCaretAfter(editor, img);
    editor.onInput();
    onClose();
  };

  return (
    <div>
      <h3 className="jc-form-title">{isEditing ? 'Edit image' : 'Insert image'}</h3>
      <div className="jc-form-field">
        <label htmlFor="jc-img-url">Image URL</label>
        <input
          id="jc-img-url"
          type="url"
          className={error ? 'jc-input-error' : ''}
          value={url}
          onChange={(e) => { setUrl(e.target.value); if (error) setError(''); }}
          autoFocus
          placeholder="https://"
        />
        {error && <div className="jc-form-error">{error}</div>}
      </div>
      <div className="jc-form-field">
        <label htmlFor="jc-img-alt">Alt text</label>
        <input id="jc-img-alt" type="text" value={alt} onChange={(e) => setAlt(e.target.value)} />
      </div>
      <div className="jc-form-actions">
        <button type="button" className="jc-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="jc-btn-primary" onClick={handleInsert}>{isEditing ? 'Save' : 'Insert'}</button>
      </div>
    </div>
  );
}
