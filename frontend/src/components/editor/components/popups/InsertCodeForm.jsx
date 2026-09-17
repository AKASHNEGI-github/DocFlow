import { useState } from 'react';
import { LANGUAGES } from '../../core/highlight';
import { buildCodeBlock } from '../../core/codeBlockDom';
import { placeCaretInside } from '../../core/domUtils';

function emptyTab() {
  return { language: 'javascript', filename: '', code: '' };
}

export default function InsertCodeForm({ editor, onClose }) {
  const [tabs, setTabs] = useState([emptyTab()]);
  const [active, setActive] = useState(0);

  const updateTab = (index, patch) => {
    setTabs((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const addTab = () => {
    setTabs((prev) => [...prev, emptyTab()]);
    setActive(tabs.length);
  };

  const removeTab = (index) => {
    if (tabs.length <= 1) return;
    setTabs((prev) => prev.filter((_, i) => i !== index));
    setActive((a) => (a >= index ? Math.max(0, a - 1) : a));
  };

  const handleInsert = () => {
    const cleanTabs = tabs.filter((t) => t.code.trim());
    if (!cleanTabs.length) return;
    editor.selection.restore();
    const block = buildCodeBlock(cleanTabs);
    const range = editor.selection.get();
    range?.collapse(false);
    range?.insertNode(block);
    // A normal paragraph right after, so there's somewhere ordinary to
    // click/type next — contenteditable="false" widgets otherwise trap
    // the cursor awkwardly. Move the caret into it too: left alone,
    // insertNode() leaves the whole code block selected, and the next
    // keystroke would delete it instead of landing in this paragraph.
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    block.after(p);
    placeCaretInside(editor, p);
    editor.onInput();
    onClose();
  };

  const t = tabs[active];

  return (
    <div>
      <h3 className="jc-form-title">Insert code{tabs.length > 1 ? ' (multi-tab)' : ''}</h3>

      <div className="jc-code-form-tabs">
        {tabs.map((tab, i) => (
          <button
            key={i}
            type="button"
            className={`jc-code-form-tab${i === active ? ' jc-code-form-tab--active' : ''}`}
            onClick={() => setActive(i)}
          >
            {tab.filename || LANGUAGES.find((l) => l.value === tab.language)?.label || `File ${i + 1}`}
            {tabs.length > 1 && (
              <span
                className="jc-code-form-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(i);
                }}
              >
                &times;
              </span>
            )}
          </button>
        ))}
        <button type="button" className="jc-code-form-tab jc-code-form-tab-add" onClick={addTab}>
          + Add file
        </button>
      </div>

      <div className="jc-form-field">
        <label htmlFor="jc-code-filename">Filename (optional, shown on the tab)</label>
        <input
          id="jc-code-filename"
          type="text"
          value={t.filename}
          onChange={(e) => updateTab(active, { filename: e.target.value })}
          placeholder="e.g. index.js"
        />
      </div>

      <div className="jc-form-field">
        <label htmlFor="jc-code-lang">Language</label>
        <select id="jc-code-lang" value={t.language} onChange={(e) => updateTab(active, { language: e.target.value })}>
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>

      <div className="jc-form-field">
        <label htmlFor="jc-code-content">Code</label>
        <textarea
          id="jc-code-content"
          className="jc-code-form-textarea"
          value={t.code}
          onChange={(e) => updateTab(active, { code: e.target.value })}
          spellCheck={false}
          autoFocus
        />
      </div>

      <div className="jc-form-actions">
        <button type="button" className="jc-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="jc-btn-primary" onClick={handleInsert}>Insert</button>
      </div>
    </div>
  );
}
