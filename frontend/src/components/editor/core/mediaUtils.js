// Support for MediaTools: detecting which image/video/embed the caret is
// on, resizing it, and moving it elsewhere in the document. None of this
// existed before — there was no resize affordance for any media type
// (native browser object-resizing only ever half-applies to <img>, and
// never to <video>/<iframe>), and nothing at all for repositioning one.

const MEDIA_SELECTOR = 'img, video, iframe';

// Clicking an image/video/iframe doesn't put the caret "inside" it the
// way clicking into a table cell does — these are atomic/void elements
// that can't contain a caret, so the browser collapses the selection to
// a sibling position just before or just after the element instead. That
// means the usual anchorNode.closest(...) trick (used by
// getCellFromSelection, for instance) doesn't work here: the selection's
// container is the element's *parent*, with an offset pointing at which
// child the click landed next to. This checks both neighbors at that
// offset for a media element.
export function getMediaFromSelection(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !root) return null;
  const range = sel.getRangeAt(0);
  const container = range.startContainer;
  if (!root.contains(container)) return null;
  if (container.nodeType !== Node.ELEMENT_NODE) return null;
  if (range.startOffset !== range.endOffset) return null; // a real text selection, not a click-on-media

  const isMedia = (n) => n && n.nodeType === Node.ELEMENT_NODE && /^(IMG|VIDEO|IFRAME)$/.test(n.tagName);
  const after = container.childNodes[range.startOffset];
  const before = container.childNodes[range.startOffset - 1];
  if (isMedia(after)) return after;
  if (isMedia(before)) return before;
  return null;
}

export function getMediaFromTarget(target) {
  return target?.closest?.(MEDIA_SELECTOR) || null;
}

// <img>/<video> know their own real pixel dimensions once loaded;
// <iframe> embeds don't, so their current rendered box is the only basis
// available for keeping the drag proportional.
export function getMediaAspectRatio(el) {
  if (el.tagName === 'IMG' && el.naturalWidth && el.naturalHeight) {
    return el.naturalWidth / el.naturalHeight;
  }
  if (el.tagName === 'VIDEO' && el.videoWidth && el.videoHeight) {
    return el.videoWidth / el.videoHeight;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width && rect.height) return rect.width / rect.height;
  return 16 / 9;
}

// Writes the new size onto the element. <iframe> embeds are sized via
// width/height attributes (that's how the video plugin already creates
// them), everything else via inline style. Also marks the element as
// manually sized: img/video default to `max-width: 100%` so they never
// overflow their container, but that same rule would silently shrink a
// deliberately-widened element right back down the moment its container
// is narrower than the new width — jc-media--sized turns that default
// off once a person has actually resized something on purpose.
export function setMediaSize(el, width, height) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (el.tagName === 'IFRAME') {
    el.setAttribute('width', String(w));
    el.setAttribute('height', String(h));
  } else {
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.removeAttribute('width');
    el.removeAttribute('height');
  }
  el.classList.add('jc-media--sized');
}

// Resolves a viewport point to a caret position, for use while dragging a
// media element to reposition it — this is the "where in the document is
// the pointer hovering right now" primitive, used both for the drop
// itself and for the insertion-line indicator shown while dragging.
export function getDropRange(clientX, clientY) {
  if (document.caretRangeFromPoint) {
    return document.caretRangeFromPoint(clientX, clientY);
  }
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(clientX, clientY);
    if (!pos || !pos.offsetNode) return null;
    const range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.collapse(true);
    return range;
  }
  return null;
}

// caretRangeFromPoint is built for resolving a position *within text* —
// hovering directly over another image/video (rather than over text near
// it) is exactly the case it's least precise for, since there's no
// character to land a caret next to. That imprecision was the main
// reason "place two images side by side" didn't work reliably by drag:
// dropping onto or near an existing image could resolve to a position
// below it instead of beside it. When the pointer is over another media
// element, this instead decides left-of/right-of that specific element
// directly from which half of its own box the pointer is over, which is
// unambiguous and lets the moved element land as its immediate sibling —
// the two then sit inline, side by side, the same as typing two images
// next to each other would.
export function getDropTarget(root, clientX, clientY, excludeEl) {
  const atPoint = document.elementFromPoint?.(clientX, clientY);
  const media = atPoint?.closest?.(MEDIA_SELECTOR);
  if (!media || !root.contains(media)) return null;
  if (media === excludeEl || excludeEl?.contains(media)) return null;
  const rect = media.getBoundingClientRect();
  const before = clientX < rect.left + rect.width / 2;
  return { media, before, rect };
}

// Moves the actual element (not a copy) to wherever the pointer is,
// rather than relying on native HTML5 drag-and-drop: only <img> is
// natively draggable by default (<video>/<iframe> aren't), native DnD is
// inconsistent across browsers about move-vs-copy, and it doesn't work
// on touch devices at all. A pointer-events-driven move, built the same
// way as the resize handle right next to it, covers all three media
// types and touch in one mechanism. Refuses to drop inside a
// contentEditable="false" widget (a code block, an alert's label) or
// inside the element being moved.
export function moveMediaToPoint(root, el, clientX, clientY) {
  // Hovering over another media element: snap to its left/right edge
  // directly (see getDropTarget above) rather than going through the
  // text-caret resolution below, which is the precise case this exists
  // for — placing images/videos next to each other in a row.
  const target = getDropTarget(root, clientX, clientY, el);
  if (target) {
    el.remove();
    if (target.before) target.media.before(el);
    else target.media.after(el);
    return true;
  }

  const range = getDropRange(clientX, clientY);
  if (!range || !root.contains(range.startContainer)) return false;
  let node = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  if (!node) return false;
  if (node.closest('[contenteditable="false"]')) return false;
  if (el === node || el.contains(node)) return false;

  el.remove();
  range.insertNode(el);
  return true;
}
