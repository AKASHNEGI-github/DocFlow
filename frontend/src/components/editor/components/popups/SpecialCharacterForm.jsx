const CHARS = [
  '\u00a9', '\u00ae', '\u2122', '\u20ac', '\u00a3', '\u00a5', '\u00a7', '\u00b6',
  '\u2020', '\u2021', '\u2022', '\u2026', '\u2030', '\u2032', '\u2033', '\u2039',
  '\u203a', '\u00ab', '\u00bb', '\u00bf', '\u00a1', '\u00d7', '\u00f7', '\u00b1',
  '\u2260', '\u2248', '\u2264', '\u2265', '\u221e', '\u221a', '\u2211', '\u03c0',
  '\u03a9', '\u03b1', '\u03b2', '\u03b3', '\u03b4', '\u00b5', '\u2202', '\u2206',
  '\u2190', '\u2192', '\u2191', '\u2193', '\u2194', '\u21d2', '\u21d4', '\u2660',
  '\u2663', '\u2665', '\u2666', '\u2713', '\u2717', '\u00bd',
];

export default function SpecialCharacterForm({ editor, onClose }) {
  const handlePick = (ch) => {
    editor.selection.restore();
    document.execCommand('insertText', false, ch);
    editor.selection.save(); // capture the new caret position so the next pick lands after this one
    editor.onInput();
  };

  return (
    <div>
      <h3 className="jc-form-title">Special characters</h3>
      <div className="jc-char-grid">
        {CHARS.map((ch) => (
          <button key={ch} type="button" className="jc-char-cell" onClick={() => handlePick(ch)}>
            {ch}
          </button>
        ))}
      </div>
      <div className="jc-form-actions">
        <button type="button" className="jc-btn-secondary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
