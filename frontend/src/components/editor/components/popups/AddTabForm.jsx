import { useState } from 'react';
import { LANGUAGES } from '../../core/highlight';
import { addTabToBlock } from '../../core/codeBlockDom';

export default function AddTabForm({ editor, block, onClose }) {
  const [language, setLanguage] = useState('javascript');
  const [filename, setFilename] = useState('');
  const [code, setCode] = useState('');

  const handleAdd = () => {
    if (!code.trim()) return;
    addTabToBlock(block, { language, filename, code });
    editor.onInput();
    onClose();
  };

  return (
    <div>
      <h3 className="jc-form-title">Add file to code block</h3>
      <div className="jc-form-field">
        <label htmlFor="jc-addtab-filename">Filename (optional, shown on the tab)</label>
        <input
          id="jc-addtab-filename"
          type="text"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder="e.g. utils.js"
          autoFocus
        />
      </div>
      <div className="jc-form-field">
        <label htmlFor="jc-addtab-lang">Language</label>
        <select id="jc-addtab-lang" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>
      <div className="jc-form-field">
        <label htmlFor="jc-addtab-code">Code</label>
        <textarea
          id="jc-addtab-code"
          className="jc-code-form-textarea"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
        />
      </div>
      <div className="jc-form-actions">
        <button type="button" className="jc-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="jc-btn-primary" onClick={handleAdd}>Add tab</button>
      </div>
    </div>
  );
}
