import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor } from '../core/EditorContext';
import {
  getCellFromSelection,
  visualColumnIndex,
  setCellAlign,
  emptyCell,
  setColumnWidth,
} from '../core/tableUtils';
import { computeFloatingBarPosition } from '../core/floatingBar';
import Icon from './Icon';
import TableColorPopup from './TableColorPopup';
import { useMenuKeyboardNav } from '../core/useMenuKeyboardNav';

const ALIGNS = [
  { icon: 'alignLeft', value: 'left', label: 'Align left' },
  { icon: 'alignCenter', value: 'center', label: 'Align center' },
  { icon: 'alignRight', value: 'right', label: 'Align right' },
  { icon: 'alignJustify', value: 'justify', label: 'Justify' },
];

function ToolBtn({ icon, title, onClick }) {
  return (
    <button type="button" className="jc-btn" title={title} onClick={onClick}>
      <Icon name={icon} />
    </button>
  );
}

// A compact icon-trigger + small labeled menu, used to fold the row/
// column/cell button clusters below into one control each instead of
// listing every action side by side — the bar used to be 15+ buttons
// wide, wide enough to force horizontal scrolling in a normal-width
// editor and to make it hard to tell related actions apart at a glance.
function MenuBtn({ icon, title, items }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  useMenuKeyboardNav(rootRef, open, setOpen);

  return (
    <div className="jc-dropdown" ref={rootRef}>
      <button
        type="button"
        className="jc-btn"
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name={icon} />
      </button>
      {open && (
        <ul className="jc-dropdown-menu" role="listbox">
          {items.map((it) => (
            <li key={it.label}>
              <button
                type="button"
                className="jc-dropdown-item jc-dropdown-item--icon"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  it.onClick();
                  setOpen(false);
                }}
              >
                <Icon name={it.icon} />
                <span>{it.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Positioned like Jodit's own inline-popup: a small floating bar attached
// to the table you're actually in, not a persistent bar pinned to the top
// of the editor. Renders inside .jc-body (a positioned, scrolling
// ancestor), so it scrolls along with the table naturally. Also renders
// the column-resize drag handles along the table's first row.
export default function TableTools() {
  const editor = useEditor();
  // Hides the entire contextual bar (including the column-resize handles)
  // while locked — this whole toolbar bypasses CommandRegistry.exec() by
  // calling tableUtils functions directly, so gating exec() alone
  // wouldn't have covered it; not rendering it at all covers every
  // button here in one place instead of guarding each one individually.
  const cell = editor.locked ? null : getCellFromSelection(editor.containerRef.current);
  const [pos, setPos] = useState(null);
  const [colHandles, setColHandles] = useState([]);
  const [dragCol, setDragCol] = useState(null);
  const barRef = useRef(null);

  // Manual repositioning (the drag handle below) is stored as an offset
  // on top of the auto-computed anchor, rather than an absolute position —
  // that way it survives the bar re-measuring itself (window resize, a
  // wider/narrower menu opening) without fighting the auto-placement
  // logic. Cleared whenever you move to a different cell/table, since a
  // manual nudge was about getting it out of the way of what you were
  // doing right then, not a placement to remember forever.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragBar, setDragBar] = useState(null);

  useEffect(() => {
    setOffset({ x: 0, y: 0 });
  }, [cell]);

  useEffect(() => {
    if (!cell) {
      setPos(null);
      setColHandles([]);
      return undefined;
    }
    const bodyEl = editor.containerRef.current?.closest('.jc-body');
    const table = cell.closest('table');
    if (!bodyEl || !table) return undefined;

    const reposition = () => {
      if (!cell.isConnected) return;
      const cellRect = cell.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();
      const bodyRect = bodyEl.getBoundingClientRect();

      // Anchored to the CELL you're actually editing, not the table's top
      // edge — a table with many rows used to always show this above row
      // 1, nowhere near where you were typing, and if the table started
      // near the top of the scroll area there wasn't enough room above it
      // at all: the bar would sit right on top of (and hide) that first
      // row instead of floating clear of it. computeFloatingBarPosition
      // flips it below the cell instead in that case (see that file).
      setPos(computeFloatingBarPosition(cellRect, bodyEl, barRef.current, { height: 38, width: 320 }));

      // One drag handle per internal column boundary, read off the first row.
      const firstRow = table.querySelector('tr');
      if (!firstRow) {
        setColHandles([]);
        return;
      }
      const cells = Array.from(firstRow.children);
      const handles = cells.slice(0, -1).map((c) => {
        const r = c.getBoundingClientRect();
        return {
          cellRef: c,
          left: r.right - bodyRect.left + bodyEl.scrollLeft - 3,
          top: tableRect.top - bodyRect.top + bodyEl.scrollTop,
          height: tableRect.height,
        };
      });
      setColHandles(handles);
    };

    reposition();
    // The bar's real width/height (used above) isn't known until it's
    // actually been painted once with its real content — this re-runs
    // the same measurement a frame later so the very first placement is
    // accurate too, not just every one after.
    const raf = requestAnimationFrame(reposition);
    window.addEventListener('resize', reposition);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', reposition);
    };
  }, [cell, editor.containerRef]);

  // Lets you drag the whole bar out of the way by its grip handle, for
  // the cases the auto-flip above doesn't fully solve on its own (a
  // table wider than the visible editor, an oddly-shaped selection).
  const startBarDrag = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setDragBar({ startX: e.clientX, startY: e.clientY, startOffset: offset });
    },
    [offset]
  );

  useEffect(() => {
    if (!dragBar) return undefined;
    const onMove = (e) => {
      setOffset({
        x: dragBar.startOffset.x + (e.clientX - dragBar.startX),
        y: dragBar.startOffset.y + (e.clientY - dragBar.startY),
      });
    };
    const onUp = () => setDragBar(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragBar]);

  // Pointer Events instead of mouse-only — mousedown/mousemove/mouseup
  // never fire from a touchscreen at all, so this drag (the only one that
  // existed anywhere in the app) simply didn't work on a tablet/touch
  // laptop. Pointer Events unify mouse, touch, and pen behind one API, so
  // the same handlers below work regardless of input device.
  const startColumnDrag = useCallback(
    (e, handle) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      const startX = e.clientX;
      const startWidth = handle.cellRef.getBoundingClientRect().width;
      const table = handle.cellRef.closest('table');
      const colIndex = visualColumnIndex(handle.cellRef);
      setDragCol({ startX, startWidth, table, colIndex });
    },
    []
  );

  useEffect(() => {
    if (!dragCol) return undefined;
    const onMove = (e) => {
      const width = Math.max(32, dragCol.startWidth + (e.clientX - dragCol.startX));
      setColumnWidth(dragCol.table, dragCol.colIndex, width);
    };
    const onUp = () => {
      setDragCol(null);
      editor.onInput();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragCol]);

  if (!cell || !pos) return null;

  const run = (command) => editor.exec(command, cell);

  return (
    <>
      <div
        ref={barRef}
        className="jc-table-tools"
        style={{ top: pos.top + offset.y, left: pos.left + offset.x }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <button
          type="button"
          className="jc-table-tools-grip"
          title="Drag to move this toolbar"
          style={{ touchAction: 'none' }}
          onPointerDown={startBarDrag}
        >
          <Icon name="move" />
        </button>
        <span className="jc-toolbar-sep" />
        <MenuBtn
          icon="rowBelow"
          title="Row"
          items={[
            { icon: 'rowAbove', label: 'Insert row above', onClick: () => run('tableInsertRowAbove') },
            { icon: 'rowBelow', label: 'Insert row below', onClick: () => run('tableInsertRowBelow') },
            { icon: 'rowDelete', label: 'Delete row', onClick: () => run('tableDeleteRow') },
          ]}
        />
        <MenuBtn
          icon="colRight"
          title="Column"
          items={[
            { icon: 'colLeft', label: 'Insert column left', onClick: () => run('tableInsertColLeft') },
            { icon: 'colRight', label: 'Insert column right', onClick: () => run('tableInsertColRight') },
            { icon: 'colDelete', label: 'Delete column', onClick: () => run('tableDeleteColumn') },
          ]}
        />
        <MenuBtn
          icon="mergeRight"
          title="Merge & split"
          items={[
            { icon: 'mergeRight', label: 'Merge with cell to the right', onClick: () => run('tableMergeRight') },
            { icon: 'mergeDown', label: 'Merge with cell below', onClick: () => run('tableMergeDown') },
            { icon: 'splitVertical', label: 'Split vertically', onClick: () => run('tableSplitVertical') },
            { icon: 'splitHorizontal', label: 'Split horizontally', onClick: () => run('tableSplitHorizontal') },
          ]}
        />
        <span className="jc-toolbar-sep" />
        <div className="jc-btn-group">
          {ALIGNS.map((a) => (
            <button
              key={a.value}
              type="button"
              className="jc-btn"
              title={a.label}
              onClick={() => {
                editor.selection.restore();
                setCellAlign(cell, a.value);
                editor.onInput();
              }}
            >
              <Icon name={a.icon} />
            </button>
          ))}
        </div>
        <span className="jc-toolbar-sep" />
        <TableColorPopup cell={cell} onApply={() => editor.onInput()} />
        <ToolBtn
          icon="emptyCell"
          title="Empty cell"
          onClick={() => {
            editor.selection.restore();
            emptyCell(cell);
            editor.onInput();
          }}
        />
        <span className="jc-toolbar-sep" />
        <MenuBtn
          icon="table"
          title="Table"
          items={[
            { icon: 'tableHeader', label: 'Toggle header row', onClick: () => run('tableToggleHeader') },
            { icon: 'tableDelete', label: 'Delete table', onClick: () => run('tableDeleteTable') },
          ]}
        />
      </div>

      {colHandles.map((h, i) => (
        <div
          key={i}
          className="jc-col-resize-handle"
          style={{ top: h.top, left: h.left, height: h.height, touchAction: 'none' }}
          onPointerDown={(e) => startColumnDrag(e, h)}
        />
      ))}
    </>
  );
}
