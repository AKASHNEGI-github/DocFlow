function makeCell(tag) {
  const cell = document.createElement(tag);
  cell.style.border = '1px solid #d1d5db';
  cell.style.padding = '6px 8px';
  cell.innerHTML = '<br>';
  return cell;
}

// Finds the <td>/<th> the current selection is inside, if any — this is
// what decides whether the contextual table bar shows at all.
export function getCellFromSelection(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !root) return null;
  let node = sel.anchorNode;
  if (!node || !root.contains(node)) return null;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  return node?.closest('td, th') || null;
}

export function cellIndex(cell) {
  return Array.prototype.indexOf.call(cell.parentElement.children, cell);
}

// Visual column index, accounting for colSpan on earlier cells in the row
// — needed by merge/split/resize, where DOM child index and "which
// column is this really" diverge once any cell spans more than one column.
export function visualColumnIndex(cell) {
  let idx = 0;
  let sib = cell.previousElementSibling;
  while (sib) {
    idx += sib.colSpan || 1;
    sib = sib.previousElementSibling;
  }
  return idx;
}

function cellAtVisualColumn(row, colIndex) {
  let acc = 0;
  for (const c of Array.from(row.children)) {
    if (acc === colIndex) return c;
    acc += c.colSpan || 1;
    if (acc > colIndex) return null; // colIndex falls inside another cell's span
  }
  return null;
}

export function setCellStyle(cell, prop, value) {
  cell.style[prop] = value;
}

export function setCellAlign(cell, align) {
  cell.style.textAlign = align;
}

export function emptyCell(cell) {
  cell.innerHTML = '<br>';
}

// Merge with the cell immediately to the right, in the same row.
export function mergeRight(cell) {
  const next = cell.nextElementSibling;
  if (!next) return;
  const a = cell.innerHTML.replace(/^\s*<br\s*\/?>\s*$/i, '').trim();
  const b = next.innerHTML.replace(/^\s*<br\s*\/?>\s*$/i, '').trim();
  cell.innerHTML = [a, b].filter(Boolean).join(' ') || '<br>';
  cell.colSpan = (cell.colSpan || 1) + (next.colSpan || 1);
  next.remove();
}

// Merge with the cell directly below, in the same visual column.
export function mergeDown(cell) {
  const row = cell.parentElement;
  const table = row.closest('table');
  const rows = Array.from(table.querySelectorAll('tr'));
  const rowIdx = rows.indexOf(row);
  if (rowIdx === -1 || rowIdx + (cell.rowSpan || 1) >= rows.length) return;
  const nextRow = rows[rowIdx + (cell.rowSpan || 1)];
  const target = cellAtVisualColumn(nextRow, visualColumnIndex(cell));
  if (!target) return;
  const a = cell.innerHTML.replace(/^\s*<br\s*\/?>\s*$/i, '').trim();
  const b = target.innerHTML.replace(/^\s*<br\s*\/?>\s*$/i, '').trim();
  cell.innerHTML = [a, b].filter(Boolean).join(' ') || '<br>';
  cell.rowSpan = (cell.rowSpan || 1) + (target.rowSpan || 1);
  target.remove();
}

// Splits are the inverse of merge — only meaningful on a cell that
// currently spans more than one column/row (i.e. one that came from a
// merge). Handles the common single-level case; deeply irregular
// pre-existing spans aren't guaranteed to come out perfectly.
export function splitVertical(cell) {
  if ((cell.colSpan || 1) <= 1) return;
  cell.colSpan -= 1;
  cell.after(makeCell(cell.tagName.toLowerCase()));
}

export function splitHorizontal(cell) {
  if ((cell.rowSpan || 1) <= 1) return;
  const row = cell.parentElement;
  const table = row.closest('table');
  const rows = Array.from(table.querySelectorAll('tr'));
  const rowIdx = rows.indexOf(row);
  cell.rowSpan -= 1;
  const targetRow = rows[rowIdx + cell.rowSpan];
  if (!targetRow) return;
  const colIdx = visualColumnIndex(cell);
  let acc = 0;
  let insertBefore = null;
  for (const c of Array.from(targetRow.children)) {
    if (acc >= colIdx) {
      insertBefore = c;
      break;
    }
    acc += c.colSpan || 1;
  }
  const newCell = makeCell(cell.tagName.toLowerCase());
  if (insertBefore) targetRow.insertBefore(newCell, insertBefore);
  else targetRow.appendChild(newCell);
}

// Sets one column's width across every row — used by the drag-to-resize
// handles. Switches the table to table-layout:fixed so explicit widths
// are actually honored instead of fighting content-based auto sizing.
export function setColumnWidth(table, colIndex, width) {
  table.style.tableLayout = 'fixed';
  table.querySelectorAll('tr').forEach((row) => {
    const cell = cellAtVisualColumn(row, colIndex);
    if (cell) cell.style.width = `${width}px`;
  });
}

export function insertRow(cell, after) {
  const row = cell.parentElement;
  const newRow = document.createElement('tr');
  Array.from(row.children).forEach((c) => newRow.appendChild(makeCell(c.tagName.toLowerCase())));
  row.parentElement.insertBefore(newRow, after ? row.nextSibling : row);
}

export function insertColumn(cell, after) {
  const table = cell.closest('table');
  const idx = cellIndex(cell);
  table.querySelectorAll('tr').forEach((r) => {
    const ref = r.children[idx];
    if (!ref) return;
    ref.insertAdjacentElement(after ? 'afterend' : 'beforebegin', makeCell(ref.tagName.toLowerCase()));
  });
}

export function deleteRow(cell) {
  const row = cell.parentElement;
  const table = row.closest('table');
  const rows = table.querySelectorAll('tr');
  if (rows.length <= 1) {
    table.remove();
  } else {
    row.remove();
  }
}

export function deleteColumn(cell) {
  const table = cell.closest('table');
  const idx = cellIndex(cell);
  const rows = table.querySelectorAll('tr');
  if ((rows[0]?.children.length || 0) <= 1) {
    table.remove();
  } else {
    rows.forEach((r) => r.children[idx]?.remove());
  }
}

export function deleteTable(cell) {
  cell.closest('table')?.remove();
}

// Tab inside a table cell currently does the browser's default thing —
// moves focus off the editor entirely, onto whatever's next in the page's
// tab order — instead of the Word/Excel/Google Docs convention of hopping
// to the next cell (and adding a row from the last cell of the last row).
// Returns true when it handled the key, so the caller preventDefault()s
// and keeps focus inside the editor.
export function handleTableTabKeyDown(editor, e) {
  if (e.key !== 'Tab') return false;
  const root = editor.containerRef.current;
  const cell = getCellFromSelection(root);
  if (!cell) return false;

  e.preventDefault();
  const row = cell.parentElement;
  const table = row.closest('table');
  const rows = Array.from(table.querySelectorAll('tr'));
  const rowIdx = rows.indexOf(row);
  const idxInRow = Array.prototype.indexOf.call(row.children, cell);

  let target;
  let addedRow = false;
  if (e.shiftKey) {
    if (idxInRow > 0) {
      target = row.children[idxInRow - 1];
    } else if (rowIdx > 0) {
      const prevRow = rows[rowIdx - 1];
      target = prevRow.children[prevRow.children.length - 1];
    }
  } else if (idxInRow < row.children.length - 1) {
    target = row.children[idxInRow + 1];
  } else if (rowIdx < rows.length - 1) {
    target = rows[rowIdx + 1].children[0];
  } else if (!editor.locked) {
    // Only add a row when the document isn't locked — everything else in
    // this function is pure navigation (safe even read-only), but this
    // one branch is a genuine content change.
    insertRow(cell, true);
    addedRow = true;
    const newRows = Array.from(table.querySelectorAll('tr'));
    target = newRows[newRows.length - 1]?.children[0];
  }

  if (target) {
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    editor.selection.save();
  }
  if (addedRow) editor.onInput();
  return true;
}

export function toggleHeaderRow(cell) {
  const table = cell.closest('table');
  const firstRow = table.querySelector('tr');
  if (!firstRow) return;
  const isHeader = firstRow.children[0]?.tagName === 'TH';
  const newTag = isHeader ? 'td' : 'th';
  Array.from(firstRow.children).forEach((c) => {
    const replacement = document.createElement(newTag);
    replacement.innerHTML = c.innerHTML;
    replacement.style.cssText = c.style.cssText;
    replacement.style.background = isHeader ? '' : '#f7f7f8';
    c.replaceWith(replacement);
  });
}
