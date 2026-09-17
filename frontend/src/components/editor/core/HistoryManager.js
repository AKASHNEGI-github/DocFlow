// Kept deliberately separate from document.execCommand('undo'). execCommand
// edits get native undo for free, but plugins that touch the DOM directly
// (table insert, classname, font-size-as-span) bypass that stack entirely —
// so relying on native undo alone gives inconsistent results. This manager
// snapshots HTML instead, debounced so fast typing doesn't spam the stack.
export class HistoryManager {
  constructor({ getHTML, setHTML, onChange, limit = 100, debounceMs = 400 }) {
    this.getHTML = getHTML;
    this.setHTML = setHTML;
    // Called whenever snapshotNow() actually pushes a new entry. The
    // debounced path below is the one case where that happens on a timer,
    // well after the input event that triggered it — with nothing to
    // tell React a render is due, the toolbar's Undo/Redo buttons would
    // otherwise sit stale (e.g. still disabled right after typing) until
    // some unrelated event happened to re-render them.
    this.onChange = onChange;
    this.limit = limit;
    this.debounceMs = debounceMs;
    this.stack = [];
    this.index = -1;
    this.timer = null;
    this.suspended = false;
  }

  // Take an immediate snapshot (used right after mount, and by undo/redo
  // themselves so they don't get re-captured by the debounce).
  snapshotNow() {
    const html = this.getHTML();
    if (this.stack[this.index] === html) return;
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(html);
    if (this.stack.length > this.limit) this.stack.shift();
    this.index = this.stack.length - 1;
    this.onChange?.();
  }

  // Called on every input event; debounced so a whole burst of typing
  // becomes one history entry instead of one per keystroke.
  snapshot() {
    if (this.suspended) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.snapshotNow(), this.debounceMs);
  }

  canUndo() {
    return this.index > 0;
  }

  canRedo() {
    return this.index < this.stack.length - 1;
  }

  undo() {
    clearTimeout(this.timer);
    if (!this.canUndo()) return;
    this.index -= 1;
    this.suspended = true;
    this.setHTML(this.stack[this.index]);
    this.suspended = false;
  }

  redo() {
    clearTimeout(this.timer);
    if (!this.canRedo()) return;
    this.index += 1;
    this.suspended = true;
    this.setHTML(this.stack[this.index]);
    this.suspended = false;
  }
}

export default HistoryManager;
