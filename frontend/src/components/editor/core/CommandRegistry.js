// Commands that map cleanly onto document.execCommand — reliable across
// browsers, and what most contentEditable-based editors (Jodit included)
// lean on for exactly this set: toggles, lists, indent, align, undo/redo,
// the horizontal rule.
const NATIVE_COMMANDS = new Set([
  'bold', 'italic', 'underline', 'strikeThrough',
  'superscript', 'subscript',
  'insertOrderedList', 'insertUnorderedList',
  'indent', 'outdent',
  'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull',
  'removeFormat',
  'insertHorizontalRule',
  'selectAll',
  'formatBlock',
  'foreColor', 'hiliteColor',
  'cut', 'copy',
]);

export class CommandRegistry {
  constructor() {
    this.customHandlers = new Map();
  }

  // Plugins call this for anything execCommand can't do well: tables,
  // classname, font-size/family (clean <span style> instead of legacy
  // <font> tags), find/replace, paint format, etc.
  register(name, handler) {
    this.customHandlers.set(name, handler);
  }

  has(name) {
    return this.customHandlers.has(name) || NATIVE_COMMANDS.has(name);
  }

  // editor is the EditorAPI (see EditorContext) — custom handlers get the
  // full API so they can reach selection, history, the DOM root, etc.
  //
  // Re-saving the selection immediately after the command runs (rather
  // than waiting on the next selectionchange/mouseup/keyup) matters more
  // than it looks: execCommand changes window.getSelection() synchronously,
  // but the browser's own `selectionchange` event fires asynchronously —
  // so without this, SelectionManager's cached range stays stale for a
  // beat. That's harmless most of the time, but "Select All" then
  // immediately clicking another button (Bold, say) landed on the *old*
  // pre-select-all range instead of the whole document, because restore()
  // for that second command re-applied the stale saved range before the
  // real one had ever been captured.
  exec(editor, name, value) {
    // "Lock" previously only ever disabled contentEditable itself — every
    // toolbar button still ran its command and mutated the DOM regardless,
    // since none of them went anywhere near that flag. Gating the one
    // choke point every plugin command and native execCommand already
    // funnels through here closes that off in a single place, without
    // having to touch every plugin. copy/selectAll don't change content
    // (same reasoning clipboardUtils already uses for copy vs cut), so
    // they stay available — a read-only document should still let you
    // select and copy out of it.
    if (editor.locked && name !== 'copy' && name !== 'selectAll') return;
    const custom = this.customHandlers.get(name);
    if (custom) {
      custom(editor, value);
      editor.selection.save();
      editor.history.snapshot();
      return;
    }
    if (NATIVE_COMMANDS.has(name)) {
      document.execCommand(name, false, value);
      editor.selection.save();
      editor.history.snapshot();
      return;
    }
    console.warn(`[editor] No handler registered for command "${name}"`);
  }

  queryState(name) {
    try {
      return document.queryCommandState(name);
    } catch {
      return false;
    }
  }

  queryValue(name) {
    try {
      return document.queryCommandValue(name);
    } catch {
      return '';
    }
  }
}

export default CommandRegistry;
