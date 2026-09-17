import { useState, useEffect, useRef } from 'react';
import { useEditor } from '../core/EditorContext';
import Icon from './Icon';
import { computeFloatingBarPosition } from '../core/floatingBar';
import InsertLinkForm from './popups/InsertLinkForm';

// insertLink.jsx could only ever create a NEW link — once one existed,
// there was no way to change its URL or remove it short of deleting the
// text and retyping it. This is the same small floating-bar pattern as
// TableTools/MediaTools, attached to whichever <a> the caret is
// currently inside, offering Edit (reopens InsertLinkForm pre-filled) and
// Remove (unwraps the link, keeping its text).
function getLinkFromSelection(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !root) return null;
  let node = sel.anchorNode;
  if (!node || !root.contains(node)) return null;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  return node?.closest('a[href]') || null;
}

function unwrapLink(link, editor) {
  const parent = link.parentNode;
  if (!parent) return;
  while (link.firstChild) parent.insertBefore(link.firstChild, link);
  parent.removeChild(link);
  editor.onInput();
}

export default function LinkTools() {
  const editor = useEditor();
  const link = editor.locked ? null : getLinkFromSelection(editor.containerRef.current);
  const [pos, setPos] = useState(null);
  const barRef = useRef(null);

  useEffect(() => {
    if (!link) {
      setPos(null);
      return undefined;
    }
    const bodyEl = editor.containerRef.current?.closest('.jc-body');
    if (!bodyEl) return undefined;

    const reposition = () => {
      if (!link.isConnected) return;
      const r = link.getBoundingClientRect();
      // Same flip-below-when-clipped-at-top logic as TableTools/
      // MediaTools (see floatingBar.js) — a link on the very first line
      // of the document used to have this bar render right on top of it.
      setPos(computeFloatingBarPosition(r, bodyEl, barRef.current, { height: 38, width: 260 }));
    };
    reposition();
    const raf = requestAnimationFrame(reposition);
    window.addEventListener('resize', reposition);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', reposition);
    };
  }, [link, editor.containerRef]);

  if (!link || !pos) return null;

  return (
    <div className="jc-media-tools" ref={barRef} style={{ top: pos.top, left: pos.left }} onMouseDown={(e) => e.preventDefault()}>
      <button
        type="button"
        className="jc-btn"
        title="Edit link"
        onClick={() => {
          editor.selection.save();
          editor.openPopup('editLink', (ed, close) => (
            <InsertLinkForm editor={ed} onClose={close} existingLink={link} />
          ));
        }}
      >
        <Icon name="edit" />
      </button>
      <button type="button" className="jc-btn" title="Remove link" onClick={() => unwrapLink(link, editor)}>
        <Icon name="unlink" />
      </button>
      <span className="jc-link-tools-url" title={link.getAttribute('href')}>
        {link.getAttribute('href')}
      </span>
    </div>
  );
}
