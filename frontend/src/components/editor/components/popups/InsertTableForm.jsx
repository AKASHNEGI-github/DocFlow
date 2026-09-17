import { useState } from 'react';
import { placeCaretInside } from '../../core/domUtils';

const MAX = 8;

export default function InsertTableForm({ editor, onClose }) {
  const [hover, setHover] = useState({ rows: 0, cols: 0 });

  const handlePick = (rows, cols) => {
    editor.selection.restore();
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    const tbody = document.createElement('tbody');
    let firstCell = null;
    for (let r = 0; r < rows; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < cols; c++) {
        const td = document.createElement('td');
        td.style.border = '1px solid #d1d5db';
        td.style.padding = '6px 8px';
        td.innerHTML = '<br>';
        if (!firstCell) firstCell = td;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    const range = editor.selection.get();
    range?.collapse(false);
    range?.insertNode(table);
    // Land the caret inside the first cell, ready to type — and,
    // critically, off of the table itself, so the next keystroke doesn't
    // wipe out the table that was just inserted.
    placeCaretInside(editor, firstCell);
    editor.onInput();
    onClose();
  };

  const cells = [];
  for (let r = 1; r <= MAX; r++) {
    for (let c = 1; c <= MAX; c++) {
      const picked = r <= hover.rows && c <= hover.cols;
      cells.push(
        <button
          key={`${r}-${c}`}
          type="button"
          className={`jc-table-cell${picked ? ' jc-table-cell--picked' : ''}`}
          onMouseEnter={() => setHover({ rows: r, cols: c })}
          onClick={() => handlePick(r, c)}
        />
      );
    }
  }

  return (
    <div>
      <h3 className="jc-form-title">Insert table</h3>
      <div className="jc-table-size-label">
        {hover.rows > 0 ? `${hover.rows} \u00d7 ${hover.cols}` : 'Hover to choose a size'}
      </div>
      <div className="jc-table-grid" onMouseLeave={() => setHover({ rows: 0, cols: 0 })}>
        {cells}
      </div>
      <div className="jc-form-actions">
        <button type="button" className="jc-btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
