import { insertRow, insertColumn, deleteRow, deleteColumn, deleteTable, toggleHeaderRow, mergeRight, mergeDown, splitVertical, splitHorizontal } from '../core/tableUtils';

// This plugin never appears on the toolbar (no `button` field, so Toolbar
// skips it) — it only registers commands. TableTools.jsx, the contextual
// bar that shows when the caret is inside a table, is what actually calls
// these, passing the current cell as the command's value.
export default {
  name: 'tableTools',
  commands: {
    tableInsertRowAbove: (editor, cell) => insertRow(cell, false),
    tableInsertRowBelow: (editor, cell) => insertRow(cell, true),
    tableInsertColLeft: (editor, cell) => insertColumn(cell, false),
    tableInsertColRight: (editor, cell) => insertColumn(cell, true),
    tableDeleteRow: (editor, cell) => deleteRow(cell),
    tableDeleteColumn: (editor, cell) => deleteColumn(cell),
    tableDeleteTable: (editor, cell) => deleteTable(cell),
    tableToggleHeader: (editor, cell) => toggleHeaderRow(cell),
    tableMergeRight: (editor, cell) => mergeRight(cell),
    tableMergeDown: (editor, cell) => mergeDown(cell),
    tableSplitVertical: (editor, cell) => splitVertical(cell),
    tableSplitHorizontal: (editor, cell) => splitHorizontal(cell),
  },
};
