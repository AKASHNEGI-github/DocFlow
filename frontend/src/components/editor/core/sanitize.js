// A light, deliberately narrow pass applied wherever HTML from OUTSIDE
// this editor's own live DOM becomes editor content: the initial value
// this editor is mounted with, every editor.setHTML() call (undo/redo
// replay, and committing out of source-view), and the toolbar's
// clipboard-based Paste button. That is exactly the boundary this app's
// own stated use case crosses constantly — content loaded back in from
// a database, which could have been written by any client, not just
// this editor, or content copied in from an arbitrary web page.
//
// This is deliberately NOT a general allowlist sanitizer: it doesn't
// touch tags, classes, or most attributes, because this editor's own
// widgets (code blocks, alerts) depend on a wide set of structural
// markup — data-*, contenteditable="false", inline SVG, <button> — that
// a strict allowlist would have to special-case anyway, and getting
// that allowlist wrong would silently corrupt legitimate saved
// documents, which for a document-management tool is its own kind of
// serious bug. Instead this strips exactly the constructs that are
// unambiguously dangerous and that this editor itself never generates:
//   - <script> elements, outright
//   - every "on*" event-handler attribute (onclick, onerror, onload...)
//     — this editor never sets these itself, so anywhere one shows up
//     in loaded content, it can only have come from outside it
//   - javascript:/vbscript: URIs in href/src/action attributes
//   - <iframe> elements pointing anywhere other than the YouTube/Vimeo
//     embed hosts the video plugin itself ever generates
const DANGEROUS_SCHEME = /^\s*(javascript|vbscript):/i;
const ALLOWED_EMBED_HOST = /^(www\.)?(youtube(-nocookie)?\.com|youtu\.be|player\.vimeo\.com)$/i;
const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction']);

// Repairs a specific, common shape of invalid list markup: a <ul>/<ol>
// sitting as a direct child of another <ul>/<ol>, rather than nested
// inside one of its <li> elements the way the HTML content model
// actually requires. This is exactly the shape Word/Google Docs paste
// (and hand-written or hand-edited-in-source-view markup) commonly
// produces, and — unlike most other tag-soup mistakes — browsers don't
// silently correct it on parse: there's no implied <li> wrapper inserted,
// so <ul><li>A</li><ul><li>B</li></ul></ul> parses and serializes back
// out exactly as written, and just renders as a second, unindented list
// sitting next to the first one instead of a nested sub-list under "A" —
// the nesting a person clearly intended gets silently lost. Confirmed by
// finding exactly this shape in a real saved document while checking why
// nested lists looked flat when reopened, not just a theoretical case.
// Moves the misplaced list to the end of the immediately preceding <li>
// (creating one to hold it, on the rare chance there isn't a preceding
// <li> to use), which is where a validly-nested version of the same
// content already puts it.
function normalizeNestedLists(root) {
  const misplaced = Array.from(root.querySelectorAll('ul, ol')).filter(
    (list) => list.parentElement && /^(UL|OL)$/.test(list.parentElement.tagName)
  );
  misplaced.forEach((list) => {
    const prevLi = list.previousElementSibling;
    if (prevLi && prevLi.tagName === 'LI') {
      prevLi.appendChild(list);
    } else {
      const li = root.ownerDocument.createElement('li');
      list.replaceWith(li);
      li.appendChild(list);
    }
  });
}

export function sanitizeHtml(html) {
  if (!html) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc.querySelectorAll('script').forEach((el) => el.remove());

  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
      } else if (URL_ATTRS.has(name) && DANGEROUS_SCHEME.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });

    if (el.tagName === 'IFRAME') {
      let host = '';
      try {
        host = new URL(el.getAttribute('src') || '', window.location.href).hostname;
      } catch {
        host = '';
      }
      if (!ALLOWED_EMBED_HOST.test(host)) el.remove();
    }
  });

  normalizeNestedLists(doc.body);

  return doc.body.innerHTML;
}

export default sanitizeHtml;
