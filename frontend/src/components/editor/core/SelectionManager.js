// The moment someone clicks a toolbar button, focus leaves the editable
// area and window.getSelection() collapses. So we keep our own copy of
// the last Range that was inside the editor, and restore it right before
// any command runs.
export class SelectionManager {
  constructor(containerRef) {
    this.containerRef = containerRef;
    this.savedRange = null;
  }

  // Call on selectionchange / mouseup / keyup while focus is in the editor.
  save() {
    const sel = window.getSelection();
    const root = this.containerRef.current;
    if (!sel || sel.rangeCount === 0 || !root) return;
    const range = sel.getRangeAt(0);
    if (root.contains(range.commonAncestorContainer)) {
      this.savedRange = range.cloneRange();
    }
  }

  // Call right before executing a command from a toolbar button/popup.
  restore() {
    const root = this.containerRef.current;
    if (!root) return;
    root.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    if (this.savedRange) {
      sel.addRange(this.savedRange);
    } else {
      // Nothing was ever selected — put the caret at the end of the content.
      const range = document.createRange();
      range.selectNodeContents(root);
      range.collapse(false);
      sel.addRange(range);
      this.savedRange = range;
    }
  }

  get() {
    return this.savedRange;
  }

  // Returns the nearest block-level ancestor of the current selection,
  // used by plugins (line-height, classname) that operate on the block
  // rather than the inline selection.
  getBlockAncestor(root) {
    let node = this.savedRange?.commonAncestorContainer;
    if (!node) return root;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    const blockTags = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI', 'PRE']);
    while (node && node !== root) {
      if (blockTags.has(node.tagName)) return node;
      node = node.parentNode;
    }
    return root;
  }
}

export default SelectionManager;
