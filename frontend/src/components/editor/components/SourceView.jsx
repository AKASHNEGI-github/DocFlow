import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor } from '../core/EditorContext';

// Backing component for "Change mode": a plain textarea showing the
// editor's HTML in place of the normal view. Editing it and switching
// back pushes the new HTML into the editor core via setHTML — the one
// legitimate case where content is pushed into contentEditable
// imperatively from outside.
//
// Reads its initial value from editor.getSourceContent() — HTML that
// EditorContext captured synchronously at the moment "source" mode was
// entered — rather than calling editor.getHTML() itself here. By the time
// this component's own mount effect would run, EditorCore has already
// unmounted (same render, ref already nulled), so a call to getHTML()
// made *here* reads empty. See EditorContext's changeMode for where the
// real capture happens.
//
// Commits back on unmount (via the effect cleanup below), not on the
// textarea's blur event — every toolbar button, including the one that
// toggles this mode off, calls preventDefault() on mousedown specifically
// so clicking it doesn't shift focus away from editable content. That
// same preventDefault also means blur never fires on this textarea when
// you click the toggle button, so anything relying on onBlur to save
// would silently discard your edits. Unmount always fires, regardless of
// how you leave source mode.
export default function SourceView() {
  const editor = useEditor();
  const [value, setValue] = useState(() => editor.getSourceContent());
  const valueRef = useRef(value);
  const textareaRef = useRef(null);

  // A <textarea> doesn't grow to fit its value the way a plain element
  // grows to fit its children — it stays whatever height CSS gives it and
  // scrolls *internally* once the value overflows that. That mismatch is
  // exactly what made this view look short with a scrollbar trapped
  // inside it, unlike the normal view (a plain div) which just grows as
  // tall as it needs to and lets the page scroll instead. Re-measuring
  // scrollHeight and applying it as an explicit height keeps this view
  // behaving the same way as the rest of the editor: no internal scroll.
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  useEffect(() => {
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  // Kept fresh on every render (unlike a value closed over inside the
  // mount-only effect below) so the unmount-time check reflects the
  // *current* lock state — including "locked while already in source
  // view," not just whatever it was when this view first mounted.
  const lockedRef = useRef(editor.locked);
  useEffect(() => {
    lockedRef.current = editor.locked;
  });

  useEffect(() => {
    // "Lock" previously had no effect at all in this view: the raw HTML
    // was always fully editable and always committed back on unmount
    // regardless, which was a way to edit a supposedly read-only document
    // without ever touching the toolbar. readOnly on the textarea below
    // stops typing; this stops the commit too, as a second line of
    // defense in case the document gets locked while already in source
    // mode with pending (now-discarded) edits.
    return () => {
      if (!lockedRef.current) editor.setHTML(valueRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    setValue(e.target.value);
    valueRef.current = e.target.value;
  };

  return (
    <textarea
      ref={textareaRef}
      className="jc-source"
      value={value}
      onChange={handleChange}
      readOnly={editor.locked}
      spellCheck={false}
      aria-label="HTML source"
      aria-readonly={editor.locked}
    />
  );
}
