import { useState, useEffect, useCallback } from 'react';
import { useEditor } from '../core/EditorContext';

function countWordsAndChars(root) {
  const text = root?.textContent || '';
  const chars = text.length;
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  return { words, chars };
}

// Same idea as Jodit's own showXPathInStatusbar option — a clickable
// breadcrumb of the tag path from the editor root down to the caret.
function getElementPath(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !root) return [];
  let node = sel.anchorNode;
  if (!node || !root.contains(node)) return [];
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  const path = [];
  while (node && node !== root && node.nodeType === Node.ELEMENT_NODE) {
    path.unshift(node);
    node = node.parentElement;
  }
  return path;
}

// Word/char count listens directly on the DOM node (see the comment
// below) so typing doesn't force the whole toolbar to re-render. The
// XPath path, in contrast, is read straight from the DOM at render time —
// cheap, and it only needs to update on selection change, which already
// re-renders every context consumer (including this one).
export default function StatusBar() {
  const editor = useEditor();
  const [counts, setCounts] = useState({ words: 0, chars: 0 });

  const update = useCallback(() => {
    // Bails out via the functional-update form when the numbers haven't
    // actually changed, by returning the *same* object reference React
    // already has. That matters here specifically because this function
    // is called from an effect with no dependency array (see below) —
    // countWordsAndChars() always returns a brand-new object, so a plain
    // setCounts(countWordsAndChars(...)) looked "changed" to React on
    // every single call (new object reference, even with identical
    // words/chars values), which re-rendered, which re-ran the effect,
    // which called this again... forever. This is what "console errors
    // climbing every second" was — an infinite render loop, not a timer.
    setCounts((prev) => {
      const next = countWordsAndChars(editor.containerRef.current);
      return prev.words === next.words && prev.chars === next.chars ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    update();
    const node = editor.containerRef.current;
    if (!node) return undefined;
    node.addEventListener('input', update);
    return () => node.removeEventListener('input', update);
    // re-attach when EditorCore remounts (switching source <-> wysiwyg)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.mode, update]);

  // Typing fires a real DOM 'input' event, which the listener above
  // catches directly. But plenty of other content changes never do —
  // deleting a code tab, inserting an alert, table edits, undo/redo — they
  // all mutate the DOM directly rather than through anything that dispatches
  // 'input', so the count above would otherwise go stale after using them
  // until the next real keystroke. Every one of those actions does call
  // bump() though, which re-renders this component with a new `editor`
  // object — so re-running the count after every render (not on a timer,
  // not on a dependency list, just "after this component rendered for any
  // reason") catches all of them for free without adding any per-keystroke
  // cost, since typing itself never triggers a React re-render here at all.
  useEffect(() => {
    update();
  });

  const path = editor.mode === 'wysiwyg' ? getElementPath(editor.containerRef.current) : [];

  const selectNode = (node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    editor.selection.save();
  };

  return (
    <div className="jc-statusbar">
      <div className="jc-statusbar-path">
        {path.map((node, i) => (
          <span key={i}>
            {i > 0 && <span className="jc-statusbar-sep">&gt;</span>}
            <button type="button" className="jc-statusbar-crumb" onClick={() => selectNode(node)}>
              {node.tagName.toLowerCase()}
            </button>
          </span>
        ))}
      </div>
      <div className="jc-statusbar-counts">
        <span>{counts.words} word{counts.words === 1 ? '' : 's'}</span>
        <span className="jc-statusbar-sep">&middot;</span>
        <span>{counts.chars} character{counts.chars === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
}
