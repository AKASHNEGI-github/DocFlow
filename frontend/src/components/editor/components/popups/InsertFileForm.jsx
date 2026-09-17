import { useState } from 'react';
import { placeCaretAfter, isSafeUrl } from '../../core/domUtils';

export default function InsertFileForm({ editor, onClose }) {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');

  const handleInsert = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    if (!isSafeUrl(trimmedUrl)) {
      setError('That link type isn\u2019t allowed. Use a web (https://) address.');
      return;
    }
    editor.selection.restore();
    const a = document.createElement('a');
    a.href = trimmedUrl;
    a.textContent = label.trim() || trimmedUrl;
    a.setAttribute('download', '');
    const range = editor.selection.get();
    range?.collapse(false);
    range?.insertNode(a);
    // Land the caret right after the file link instead of leaving it
    // selected, so continuing to type doesn't wipe it out again.
    placeCaretAfter(editor, a);
    editor.onInput();
    onClose();
  };

  return (
    <div>
      <h3 className="jc-form-title">Insert file</h3>
      <div className="jc-form-field">
        <label htmlFor="jc-file-url">File URL</label>
        <input
          id="jc-file-url"
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
        <label htmlFor="jc-file-label">Link text</label>
        <input id="jc-file-label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div className="jc-form-actions">
        <button type="button" className="jc-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="jc-btn-primary" onClick={handleInsert}>Insert</button>
      </div>
    </div>
  );
}
