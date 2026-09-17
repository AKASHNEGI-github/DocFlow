import { blobToDataURL } from '../core/clipboardUtils';
import { sanitizeHtml } from '../core/sanitize';

// Ctrl+V just works natively in any contentEditable — no code needed for
// that. This BUTTON is the fiddly part: Chrome blocks
// execCommand('paste') for security, so it has to go through the async,
// permission-gated Clipboard API instead. `read()` (not just `readText()`)
// is used so an image on the clipboard — a screenshot, "Copy Image" on a
// local file — pastes as an image instead of silently doing nothing; rich
// HTML and plain text are the fallbacks after that, in that order, so this
// button now matches what Ctrl+V is already capable of.
export default {
  name: 'paste',
  button: {
    icon: 'paste',
    tooltip: 'Paste',
    type: 'instant',
    onClick: async (editor) => {
      editor.selection.restore();
      try {
        if (navigator.clipboard.read) {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            const imageType = item.types.find((t) => t.startsWith('image/'));
            if (!imageType) continue;
            const blob = await item.getType(imageType);
            const dataUrl = await blobToDataURL(blob);
            document.execCommand('insertImage', false, dataUrl);
            editor.history.snapshot();
            return;
          }
          const htmlItem = items.find((item) => item.types.includes('text/html'));
          if (htmlItem) {
            const blob = await htmlItem.getType('text/html');
            const html = await blob.text();
            // Sanitized before it ever touches the DOM — this is HTML
            // from whatever's on the OS clipboard (another tab, another
            // app entirely), not from this editor, so it gets the same
            // treatment as content loaded in from the database.
            document.execCommand('insertHTML', false, sanitizeHtml(html));
            editor.history.snapshot();
            return;
          }
        }
        const text = await navigator.clipboard.readText();
        document.execCommand('insertText', false, text);
        editor.history.snapshot();
      } catch (err) {
        console.warn('[paste] Clipboard permission denied — use Ctrl+V instead.', err);
      }
    },
  },
};
