import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor } from '../core/EditorContext';
import Icon from './Icon';
import {
  getMediaFromSelection,
  getMediaAspectRatio,
  setMediaSize,
  getDropTarget,
  moveMediaToPoint,
} from '../core/mediaUtils';
import { computeFloatingBarPosition } from '../core/floatingBar';
import InsertImageForm from './popups/InsertImageForm';
import InsertVideoForm from './popups/InsertVideoForm';

// Floating overlay attached to whichever image/video/embed the caret is
// currently on — same positioning approach as TableTools' contextual bar
// (measure the element, place a small bar above it inside .jc-body).
// Gives three things nothing in this editor could do before: resize
// (three handles — see below), move (drag handle, repositions the real
// node elsewhere in the document), and edit (reopens the insert form
// pre-filled, instead of delete-and-redo being the only option).
export default function MediaTools() {
  const editor = useEditor();
  const media = editor.locked ? null : getMediaFromSelection(editor.containerRef.current);
  const [pos, setPos] = useState(null);
  const [dragResize, setDragResize] = useState(null);
  const [dragMove, setDragMove] = useState(null);
  const indicatorRef = useRef(null);
  const barRef = useRef(null);

  useEffect(() => {
    if (!media) {
      setPos(null);
      return undefined;
    }
    const bodyEl = editor.containerRef.current?.closest('.jc-body');
    if (!bodyEl) return undefined;

    const reposition = () => {
      if (!media.isConnected) return;
      const r = media.getBoundingClientRect();
      const bodyRect = bodyEl.getBoundingClientRect();
      const toBody = (x, y) => ({
        top: y - bodyRect.top + bodyEl.scrollTop,
        left: x - bodyRect.left + bodyEl.scrollLeft,
      });
      const corner = toBody(r.right, r.bottom);
      const rightEdge = toBody(r.right, r.top + r.height / 2);
      const bottomEdge = toBody(r.left + r.width / 2, r.bottom);
      // Same flip-below-when-clipped-at-top logic as TableTools/LinkTools
      // (see floatingBar.js) — an image/video sitting at the very top of
      // the document used to have this bar rendered right on top of it,
      // covering the one thing you were trying to work with.
      const barPos = computeFloatingBarPosition(r, bodyEl, barRef.current, { height: 38, width: 90 });
      setPos({
        top: barPos.top,
        left: barPos.left,
        cornerTop: corner.top - 8,
        cornerLeft: corner.left - 8,
        rightEdgeTop: rightEdge.top - 8,
        rightEdgeLeft: rightEdge.left - 5,
        bottomEdgeTop: bottomEdge.top - 5,
        bottomEdgeLeft: bottomEdge.left - 8,
      });
    };
    reposition();
    const raf = requestAnimationFrame(reposition);
    window.addEventListener('resize', reposition);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', reposition);
    };
  }, [media, editor.containerRef]);

  // --- Resize: three independent handles ---
  // 'corner' keeps the aspect ratio (both dimensions change together);
  // 'right'/'bottom' change only that one axis, holding the other at
  // whatever it currently is. Previously there was only the proportional
  // corner handle, with no way to adjust width and height independently —
  // e.g. to make a video shorter without also narrowing it, or to match
  // several images to the same height so they sit neatly in a row.
  const startResize = useCallback(
    (e, mode) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      const rect = media.getBoundingClientRect();
      setDragResize({
        mode,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: rect.width,
        startHeight: rect.height,
        ratio: getMediaAspectRatio(media),
      });
    },
    [media]
  );

  useEffect(() => {
    if (!dragResize) return undefined;
    const onMove = (e) => {
      let width = dragResize.startWidth;
      let height = dragResize.startHeight;
      if (dragResize.mode === 'corner') {
        width = Math.max(40, dragResize.startWidth + (e.clientX - dragResize.startX));
        height = width / (dragResize.ratio || 1);
      } else if (dragResize.mode === 'right') {
        width = Math.max(40, dragResize.startWidth + (e.clientX - dragResize.startX));
      } else if (dragResize.mode === 'bottom') {
        height = Math.max(30, dragResize.startHeight + (e.clientY - dragResize.startY));
      }
      setMediaSize(media, width, height);
    };
    const onUp = () => {
      setDragResize(null);
      editor.onInput();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragResize]);

  // --- Move: drag the move handle, drop anywhere else in the document ---
  const startMove = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragMove(true);
  }, []);

  useEffect(() => {
    if (!dragMove) return undefined;
    const root = editor.containerRef.current;
    const bodyEl = root?.closest('.jc-body');

    const onMove = (e) => {
      if (!root || !bodyEl || !indicatorRef.current) return;
      const bodyRect = bodyEl.getBoundingClientRect();

      // Hovering over another image/video: show a vertical line snapped
      // to its near edge, so it's obvious the drop will land beside it
      // (this is also exactly what moveMediaToPoint itself does on drop —
      // see the comment there for why this needed its own path instead
      // of reusing the text-caret line below for this case).
      const target = getDropTarget(root, e.clientX, e.clientY, media);
      if (target) {
        const x = target.before ? target.rect.left : target.rect.right;
        indicatorRef.current.style.display = 'block';
        indicatorRef.current.style.width = '2px';
        indicatorRef.current.style.height = `${target.rect.height}px`;
        indicatorRef.current.style.top = `${target.rect.top - bodyRect.top + bodyEl.scrollTop}px`;
        indicatorRef.current.style.left = `${x - bodyRect.left + bodyEl.scrollLeft}px`;
        return;
      }

      const range = document.caretRangeFromPoint
        ? document.caretRangeFromPoint(e.clientX, e.clientY)
        : null;
      if (!range || !root.contains(range.startContainer)) {
        indicatorRef.current.style.display = 'none';
        return;
      }
      const rects = range.getClientRects();
      const r = rects[0];
      if (!r) {
        indicatorRef.current.style.display = 'none';
        return;
      }
      indicatorRef.current.style.display = 'block';
      indicatorRef.current.style.width = '2px';
      indicatorRef.current.style.top = `${r.top - bodyRect.top + bodyEl.scrollTop}px`;
      indicatorRef.current.style.left = `${r.left - bodyRect.left + bodyEl.scrollLeft}px`;
      indicatorRef.current.style.height = `${r.height || 20}px`;
    };
    const onUp = (e) => {
      if (indicatorRef.current) indicatorRef.current.style.display = 'none';
      setDragMove(false);
      if (root) {
        moveMediaToPoint(root, media, e.clientX, e.clientY);
        editor.selection.save();
        editor.onInput();
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragMove]);

  if (!media || !pos) return null;

  const isImage = media.tagName === 'IMG';
  const isVideo = media.tagName === 'VIDEO';
  const canEdit = isImage || isVideo || media.tagName === 'IFRAME';

  const openEdit = () => {
    editor.selection.save();
    if (isImage) {
      editor.openPopup('editMedia', (ed, close) => (
        <InsertImageForm editor={ed} onClose={close} existingImage={media} />
      ));
    } else {
      editor.openPopup('editMedia', (ed, close) => (
        <InsertVideoForm editor={ed} onClose={close} existingVideo={media} />
      ));
    }
  };

  return (
    <>
      <div className="jc-media-tools" ref={barRef} style={{ top: pos.top, left: pos.left }} onMouseDown={(e) => e.preventDefault()}>
        <button
          type="button"
          className="jc-btn"
          title="Move (drag) — drop next to another image/video to place them side by side"
          style={{ touchAction: 'none' }}
          onPointerDown={startMove}
        >
          <Icon name="move" />
        </button>
        {canEdit && (
          <button type="button" className="jc-btn" title={isImage ? 'Edit image' : 'Edit video'} onClick={openEdit}>
            <Icon name="edit" />
          </button>
        )}
      </div>
      <div
        className="jc-media-resize-handle jc-media-resize-handle--corner"
        title="Resize (keeps proportions)"
        style={{ top: pos.cornerTop, left: pos.cornerLeft, touchAction: 'none' }}
        onPointerDown={(e) => startResize(e, 'corner')}
      />
      <div
        className="jc-media-resize-handle jc-media-resize-handle--right"
        title="Resize width only"
        style={{ top: pos.rightEdgeTop, left: pos.rightEdgeLeft, touchAction: 'none' }}
        onPointerDown={(e) => startResize(e, 'right')}
      />
      <div
        className="jc-media-resize-handle jc-media-resize-handle--bottom"
        title="Resize height only"
        style={{ top: pos.bottomEdgeTop, left: pos.bottomEdgeLeft, touchAction: 'none' }}
        onPointerDown={(e) => startResize(e, 'bottom')}
      />
      <div ref={indicatorRef} className="jc-media-drop-indicator" style={{ display: 'none' }} />
    </>
  );
}
