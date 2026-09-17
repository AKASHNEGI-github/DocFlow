import { placeCaretInside } from './domUtils';

export const ALERT_TYPES = [
  { label: 'Note', value: 'note' },
  { label: 'Tip', value: 'tip' },
  { label: 'Important', value: 'important' },
  { label: 'Caution', value: 'caution' },
  { label: 'Warning', value: 'warning' },
];

const LABELS = Object.fromEntries(ALERT_TYPES.map((t) => [t.value, t.label]));

// Wraps the current block in a colored callout — same shape as a
// blockquote (a container the user keeps typing normal content into),
// just with a type-specific color and a fixed, non-editable label at the
// top rather than the plain grey line a quote gets. Adopted from GitHub-
// flavored markdown's alert blocks (> [!NOTE], etc.).
export function insertAlert(editor, type) {
  editor.selection.restore();
  const root = editor.containerRef.current;
  const block = editor.selection.getBlockAncestor(root);

  const wrapper = document.createElement('div');
  wrapper.className = `jc-alert jc-alert--${type}`;

  const label = document.createElement('div');
  label.className = 'jc-alert-label';
  label.contentEditable = 'false';
  label.textContent = LABELS[type] || type;

  const content = document.createElement('div');
  content.className = 'jc-alert-content';

  // getBlockAncestor() matches the nearest <div> — which, if the caret
  // is already inside an existing alert (very reachable now that
  // inserting one leaves the caret right inside it, ready to keep
  // typing), resolves to that alert's OWN content <div>. Wrapping that
  // would nest a new alert inside the old one instead of placing a new
  // one alongside it, and loses whatever the enclosing alert's replaced
  // content div wasn't carrying over. Treat the whole enclosing alert as
  // the anchor instead, and add the new one right after it.
  const enclosingAlert = block?.closest?.('.jc-alert');
  if (enclosingAlert && root.contains(enclosingAlert)) {
    content.innerHTML = '<br>';
    wrapper.append(label, content);
    enclosingAlert.after(wrapper);
  } else if (block && block !== root) {
    content.innerHTML = block.innerHTML || '<br>';
    wrapper.append(label, content);
    block.replaceWith(wrapper);
  } else {
    content.innerHTML = '<br>';
    wrapper.append(label, content);
    const range = editor.selection.get();
    range?.insertNode(wrapper);
  }
  // Every branch above leaves the browser's own selection stale (still
  // referring to the block that just got replaced, or spanning the
  // whole freshly-inserted wrapper) — so without this, the very next
  // keystroke replaces the alert's content instead of extending it.
  // Land the caret at the end of the alert's own body either way.
  placeCaretInside(editor, content);
}

// Fixes the "can't get out of the alert" trap: with nothing intercepting
// Enter, the browser's native contentEditable behavior just keeps
// splitting the alert's own content block into more lines forever — there
// was no way to leave. This mirrors how a native <blockquote> already
// behaves (Enter on an empty line exits the quote), rather than inventing
// a new convention: Enter only exits when the current line is empty AND
// it's the last line in the alert, so short one-line notes still work
// exactly like before and multi-line notes aren't broken by every Enter
// bouncing you out. Escape exits unconditionally, as an explicit
// "get me out of here" the empty-line rule doesn't require you to know.
//
// Returns true when it handled the key (so the caller knows to
// preventDefault and stop), false to let the browser do its normal thing.
export function handleAlertKeyDown(editor, e) {
  if (editor.locked) return false;
  if (e.key !== 'Enter' && e.key !== 'Escape') return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
  const root = editor.containerRef.current;
  let node = sel.anchorNode;
  if (!node || !root?.contains(node)) return false;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  // Chrome (and most browsers) clone this exact div — class and all — as
  // a sibling every time Enter splits a line inside it, so the closest
  // .jc-alert-content ancestor of the caret IS the current line, not
  // necessarily the alert's original content block.
  const line = node?.closest('.jc-alert-content');
  if (!line || !root.contains(line)) return false;

  const isEscape = e.key === 'Escape';
  const lineIsEmpty = line.textContent.trim() === '';
  const isLastLine = !line.nextElementSibling;

  // Plain Enter on a non-empty (or non-last) line: let the browser handle
  // it natively and stay inside the alert, same as today.
  if (!isEscape && !(lineIsEmpty && isLastLine)) return false;

  e.preventDefault();
  const wrapper = line.closest('.jc-alert');
  if (!wrapper) return false;
  // Only drop the trailing empty line if there's an earlier *content*
  // line to fall back on (not just the label) — otherwise this would
  // empty the alert out entirely, leaving it with no body at all.
  const previous = line.previousElementSibling;
  if (lineIsEmpty && previous && previous.classList.contains('jc-alert-content')) line.remove();

  const p = document.createElement('p');
  p.innerHTML = '<br>';
  wrapper.after(p);
  const range = document.createRange();
  range.selectNodeContents(p);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  editor.selection.save();
  editor.onInput();
  return true;
}
