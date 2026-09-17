import { useEditor } from '../core/EditorContext';
import { handleEditorCopy, handleEditorCut, handleEditorPaste } from '../core/clipboardUtils';
import { handleAlertKeyDown } from '../core/alertUtils';
import { handleTableTabKeyDown } from '../core/tableUtils';

// This is the one component in the whole app that is NOT re-rendered from
// React state on every keystroke. contentEditable owns its own DOM while
// someone is typing; if we re-rendered innerHTML from state here, the
// cursor would jump to the start of the text after every character.
// Content only gets pushed in imperatively (via editor.setHTML), for
// deliberate actions: undo/redo, loading new content, leaving source mode.
export default function EditorCore() {
  const editor = useEditor();

  const handleMouseUp = () => editor.selection.save();
  const handleKeyUp = () => editor.selection.save();

  // Route Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or +Y) through the app's own
  // history stack instead of leaving them to the browser's native
  // contentEditable undo manager. The two track different things —
  // native undo has no idea about table edits, code blocks, or alerts,
  // and this app's stack has no idea a native undo just happened — so
  // with both active at once, the toolbar's own Undo button and Ctrl+Z
  // can quietly fight each other and even bring back content the user
  // just deleted. preventDefault() here keeps exactly one system in
  // charge of undo/redo, always.
  const handleKeyDown = (e) => {
    // Lets you get back out of an alert callout (Enter on an empty last
    // line, or Escape unconditionally) and Tab between table cells,
    // before falling through to the undo/redo shortcuts below.
    if (handleAlertKeyDown(editor, e)) return;
    if (handleTableTabKeyDown(editor, e)) return;
    if ((!e.ctrlKey && !e.metaKey) || e.altKey) return;
    // Keeps Ctrl+Z/Y from being a back door around a locked/read-only
    // document — the toolbar's own Undo/Redo buttons are disabled while
    // locked (see Toolbar.jsx), but nothing stopped the keyboard shortcut
    // from still running the same thing.
    if (editor.locked) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      editor.history.undo();
    } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
      e.preventDefault();
      editor.history.redo();
    }
  };

  return (
    <div
      ref={editor.containerRef}
      className="jc-content"
      contentEditable={!editor.locked}
      suppressContentEditableWarning
      onInput={editor.onInput}
      onMouseUp={handleMouseUp}
      onKeyUp={handleKeyUp}
      onKeyDown={handleKeyDown}
      onCopy={(e) => handleEditorCopy(editor, e)}
      onCut={(e) => handleEditorCut(editor, e)}
      onPaste={(e) => handleEditorPaste(editor, e)}
      role="textbox"
      aria-multiline="true"
      aria-readonly={editor.locked}
      aria-label="Rich text content"
    />
  );
}
