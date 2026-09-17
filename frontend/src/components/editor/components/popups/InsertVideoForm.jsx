import { useState } from 'react';
import { placeCaretAfter, isSafeUrl } from '../../core/domUtils';

function toEmbedUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return `https://player.vimeo.com/video/${id}`;
    }
    return null; // not a known embed host — treat as a direct video file
  } catch {
    return null;
  }
}

// Also handles editing an existing video/embed (opened from MediaTools,
// passing `existingVideo`) — previously the only option was insert-a-
// new-one. Editing rebuilds the tag rather than mutating in place, since
// switching between an embed <iframe> and a direct <video> file changes
// the tag itself, which can't be done to an existing element. For a
// YouTube/Vimeo embed, `data-original-url` (set at insert time) is what
// lets the edit form show the original watch/share link back instead of
// the transformed /embed/... URL, which toEmbedUrl() can't reverse.
export default function InsertVideoForm({ editor, onClose, existingVideo }) {
  const isEditing = !!existingVideo;
  const initialUrl = isEditing
    ? existingVideo.tagName === 'IFRAME'
      ? existingVideo.dataset.originalUrl || existingVideo.getAttribute('src') || ''
      : existingVideo.getAttribute('src') || ''
    : '';
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState('');

  const buildNode = (trimmedUrl, embed) => {
    if (embed) {
      const node = document.createElement('iframe');
      node.src = embed;
      node.width = (isEditing && existingVideo.getAttribute('width')) || '560';
      node.height = (isEditing && existingVideo.getAttribute('height')) || '315';
      node.style.border = '0';
      node.allowFullscreen = true;
      node.dataset.originalUrl = trimmedUrl;
      return node;
    }
    const node = document.createElement('video');
    node.src = trimmedUrl;
    node.controls = true;
    node.style.maxWidth = '100%';
    return node;
  };

  const handleInsert = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    const embed = toEmbedUrl(trimmedUrl);
    if (!embed && !isSafeUrl(trimmedUrl)) {
      setError('That video address isn\u2019t allowed. Use a YouTube/Vimeo link or a direct https:// video URL.');
      return;
    }

    if (isEditing) {
      const node = buildNode(trimmedUrl, embed);
      if (existingVideo.classList.contains('jc-media--sized')) {
        node.classList.add('jc-media--sized');
        if (!embed) {
          node.style.width = existingVideo.style.width;
          node.style.height = existingVideo.style.height;
        }
      }
      existingVideo.replaceWith(node);
      editor.onInput();
      onClose();
      return;
    }

    editor.selection.restore();
    const node = buildNode(trimmedUrl, embed);
    const range = editor.selection.get();
    range?.collapse(false);
    range?.insertNode(node);
    // Land the caret right after the video instead of leaving it
    // selected, so continuing to type doesn't wipe it out again.
    placeCaretAfter(editor, node);
    editor.onInput();
    onClose();
  };

  return (
    <div>
      <h3 className="jc-form-title">{isEditing ? 'Edit video' : 'Insert video'}</h3>
      <div className="jc-form-field">
        <label htmlFor="jc-video-url">YouTube, Vimeo, or direct video URL</label>
        <input
          id="jc-video-url"
          type="url"
          className={error ? 'jc-input-error' : ''}
          value={url}
          onChange={(e) => { setUrl(e.target.value); if (error) setError(''); }}
          autoFocus
          placeholder="https://www.youtube.com/watch?v=..."
        />
        {error && <div className="jc-form-error">{error}</div>}
      </div>
      <div className="jc-form-actions">
        <button type="button" className="jc-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="jc-btn-primary" onClick={handleInsert}>{isEditing ? 'Save' : 'Insert'}</button>
      </div>
    </div>
  );
}
