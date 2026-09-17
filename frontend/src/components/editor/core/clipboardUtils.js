import { sanitizeHtml } from './sanitize';

// Clipboard handling for the contentEditable area.
//
// The html payload is built from a raw clone of the selected DOM nodes,
// deliberately not delegating to the browser's own copy algorithm.
// Chromium in particular walks up the ancestor chain during a native copy
// and stamps each ancestor's *computed* style — including background-color
// — onto the copied fragment. That's what was dragging an alert box's
// background color along whenever someone copied text out of it: the
// color lives on the wrapping <div class="jc-alert--tip">, not on the
// text itself, but the browser's own copy still baked it in as an inline
// style on the clipboard payload. A raw clone of just the selected nodes
// only carries styling that's genuinely on them — a highlight color you
// actually applied to the text survives, but a container's background you
// never touched doesn't. The same raw clone is why this also fixes
// copying links and images: cloneContents() keeps the real <a href> and
// <img src> intact, rather than depending on execCommand('copy') to
// notice them on its own.
function cloneRangeToFragmentHTML(range) {
  const fragment = range.cloneContents();
  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);
  return wrapper.innerHTML;
}

function getUsableRange(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !root) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  return range;
}

// Shared by native copy/cut (Ctrl+C/X, right-click menu) AND the toolbar's
// Copy/Cut buttons: document.execCommand('copy'/'cut') dispatches these
// exact same events on the focused element before doing anything else, so
// intercepting them here covers every trigger in one place.
export function handleEditorCopy(editor, event) {
  const range = getUsableRange(editor.containerRef.current);
  if (!range) return; // nothing selected — let the browser's (harmless) default run
  event.preventDefault();
  event.clipboardData.setData('text/plain', range.toString());
  event.clipboardData.setData('text/html', cloneRangeToFragmentHTML(range));
}

export function handleEditorCut(editor, event) {
  if (editor.locked) return; // read-only — copying out is fine, removing content isn't
  const range = getUsableRange(editor.containerRef.current);
  if (!range) return;
  event.preventDefault();
  event.clipboardData.setData('text/plain', range.toString());
  event.clipboardData.setData('text/html', cloneRangeToFragmentHTML(range));
  range.deleteContents();
  editor.selection.save();
  editor.onInput();
}

// The Async Clipboard API hands back Blobs, not URLs — this is the
// promisified FileReader dance to turn one into a data: URL that can go
// straight into an <img src>.
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Ctrl+V for plain text works natively with no code needed. HTML on the
// clipboard is the case that actually matters here, and it used to be
// left to the browser's own default paste entirely — which is exactly
// the "content copied in from an arbitrary web page" scenario sanitize.js
// says it exists to cover, so letting it bypass sanitizeHtml() entirely
// was the gap. This intercepts it, runs it through the same sanitizer
// every other external-content boundary in this app already uses
// (initialValue, setHTML/undo-redo, the toolbar's own Paste button), and
// inserts the cleaned result instead of falling through to native paste.
//
// The other case handled here is a *raw* image sitting on the clipboard
// with nothing else alongside it — a screenshot, or "Copy Image" on a
// local file — which not every browser turns into an <img> on its own.
export function handleEditorPaste(editor, event) {
  if (editor.locked) return; // read-only — nothing should be inserted
  const items = event.clipboardData?.items;
  if (!items) return;
  const list = Array.from(items);

  const htmlItem = list.find((item) => item.type === 'text/html');
  if (htmlItem) {
    event.preventDefault();
    const html = event.clipboardData.getData('text/html');
    editor.selection.restore();
    document.execCommand('insertHTML', false, sanitizeHtml(html));
    editor.onInput();
    return;
  }

  const imageItem = list.find((item) => item.kind === 'file' && item.type.startsWith('image/'));
  if (!imageItem) return;

  event.preventDefault();
  const file = imageItem.getAsFile();
  if (!file) return;
  blobToDataURL(file).then((dataUrl) => {
    editor.selection.restore();
    document.execCommand('insertImage', false, dataUrl);
    editor.onInput();
  });
}
