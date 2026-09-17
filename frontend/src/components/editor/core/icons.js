// Central icon set. Every icon is a plain SVG string, 20x20, using
// currentColor so it inherits whatever color the toolbar button sets
// (handles hover/active/dark-mode states for free — no per-icon CSS).
//
// This is our own icon set, drawn to match common rich-text-editor
// toolbar conventions (the same pictograms Jodit, Word, Docs etc. all
// use for these actions) — not copied from any particular library.

const s = (inner) =>
  `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

const STROKE = 'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';

export const ICONS = {
  // Redrawn as proper stroke paths rather than <text> glyphs — text glyphs
  // render at whatever weight/style the browser's serif fallback happens
  // to use, which made these noticeably heavier and less consistent than
  // every stroke-built icon around them (font rendering isn't something
  // we control the way a path's own stroke-width is).
  bold: s(`<path d="M6.3 4.3h4.4a2.9 2.9 0 0 1 0 5.8H6.3z" ${STROKE}/><path d="M6.3 10.1h5.1a3 3 0 0 1 0 6H6.3z" ${STROKE}/>`),
  italic: s(`<path d="M8.3 4.5h5.8M5.9 15.5h5.8M12.6 4.5l-4.4 11" ${STROKE}/>`),
  underline: s(`<path d="M5.2 4v6.2a4.8 4.8 0 0 0 9.6 0V4" ${STROKE}/><line x1="4" y1="16.3" x2="16" y2="16.3" ${STROKE}/>`),
  strikeThrough: s(`<path d="M12.8 6.8c-.2-1.6-1.6-2.6-3.4-2.6-2 0-3.5 1-3.5 2.5 0 1.6 1.5 2.1 3.5 2.6M6.6 13.1c.2 1.6 1.7 2.6 3.5 2.6 2 0 3.6-1 3.6-2.6 0-.5-.2-.9-.5-1.3" ${STROKE}/><line x1="3.3" y1="10" x2="16.7" y2="10" ${STROKE}/>`),
  clearFormatting: s(`<path d="M6 15 L15 6" ${STROKE}/><path d="M8 4h6l2 2-8 8H6l-2-2z" ${STROKE}/><line x1="3" y1="17" x2="17" y2="17" ${STROKE}/>`),
  orderedList: s(`<line x1="8.3" y1="5" x2="17" y2="5" ${STROKE}/><line x1="8.3" y1="10" x2="17" y2="10" ${STROKE}/><line x1="8.3" y1="15" x2="17" y2="15" ${STROKE}/><text x="1.5" y="7" font-size="6" font-family="Arial, sans-serif" fill="currentColor">1</text><text x="1.5" y="12" font-size="6" font-family="Arial, sans-serif" fill="currentColor">2</text><text x="1.5" y="17" font-size="6" font-family="Arial, sans-serif" fill="currentColor">3</text>`),
  unorderedList: s(`<line x1="8" y1="5" x2="17" y2="5" ${STROKE}/><line x1="8" y1="10" x2="17" y2="10" ${STROKE}/><line x1="8" y1="15" x2="17" y2="15" ${STROKE}/><circle cx="4" cy="5" r="1.3" fill="currentColor"/><circle cx="4" cy="10" r="1.3" fill="currentColor"/><circle cx="4" cy="15" r="1.3" fill="currentColor"/>`),
  font: s(`<path d="M3.2 15.5L7.6 4.3h.9l4.3 11.2M5.1 11.4h6.2" ${STROKE}/>`),
  fontSize: s(`<path d="M2.3 14.7L5.9 5.5h.8l3.5 9.2M3.8 11.2h4.9" ${STROKE}/><path d="M15 12.5v-9M12.3 6.3L15 3.5l2.7 2.8" ${STROKE}/>`),
  formatBlock: s(`<path d="M12.3 3v14" ${STROKE}/><path d="M12.3 3H9.2a3 3 0 0 0 0 6h3.1" ${STROKE}/>`),
  lineHeight: s(`<path d="M4 4v12M2 6l2-2 2 2M2 14l2 2 2-2" ${STROKE}/><line x1="9" y1="5" x2="17" y2="5" ${STROKE}/><line x1="9" y1="10" x2="17" y2="10" ${STROKE}/><line x1="9" y1="15" x2="17" y2="15" ${STROKE}/>`),
  superscript: s(`<path d="M2.5 8.8l5.6 7M8.1 8.8l-5.6 7" ${STROKE}/><text x="11" y="8" font-size="7" font-weight="600" font-family="Arial, sans-serif" fill="currentColor">2</text>`),
  subscript: s(`<path d="M2.5 5.2l5.6 7M8.1 5.2l-5.6 7" ${STROKE}/><text x="11" y="17.3" font-size="7" font-weight="600" font-family="Arial, sans-serif" fill="currentColor">2</text>`),
  file: s(`<path d="M6 2h6l4 4v12H6z" ${STROKE}/><path d="M12 2v4h4" ${STROKE}/>`),
  image: s(`<rect x="3" y="4" width="14" height="12" rx="1.5" ${STROKE}/><circle cx="7.5" cy="8.5" r="1.4" ${STROKE}/><path d="M4 15l4.5-4.5 3 3L15 10l2 2" ${STROKE}/>`),
  video: s(`<rect x="2" y="5" width="12" height="10" rx="1.5" ${STROKE}/><path d="M14 9l4-2.5v7L14 11" ${STROKE}/>`),
  cut: s(`<circle cx="6" cy="15" r="2.2" ${STROKE}/><circle cx="6" cy="5" r="2.2" ${STROKE}/><path d="M7.8 6.6L17 16M7.8 13.4L17 4" ${STROKE}/>`),
  copy: s(`<rect x="7" y="7" width="10" height="11" rx="1.2" ${STROKE}/><path d="M13 7V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3" ${STROKE}/>`),
  paste: s(`<rect x="4" y="4" width="12" height="14" rx="1.2" ${STROKE}/><rect x="7" y="2" width="6" height="3" rx="1" ${STROKE}/><line x1="7" y1="10" x2="13" y2="10" ${STROKE}/><line x1="7" y1="13" x2="13" y2="13" ${STROKE}/>`),
  selectAll: s(`<path d="M3 7V4a1 1 0 0 1 1-1h3M13 3h3a1 1 0 0 1 1 1v3M17 13v3a1 1 0 0 1-1 1h-3M7 17H4a1 1 0 0 1-1-1v-3" ${STROKE}/><rect x="7" y="7" width="6" height="6" rx="0.5" fill="currentColor"/>`),
  horizontalLine: s(`<line x1="3" y1="10" x2="17" y2="10" ${STROKE}/>`),
  table: s(`<rect x="3" y="3" width="14" height="14" rx="1" ${STROKE}/><line x1="3" y1="8" x2="17" y2="8" ${STROKE}/><line x1="3" y1="13" x2="17" y2="13" ${STROKE}/><line x1="9" y1="3" x2="9" y2="17" ${STROKE}/>`),
  link: s(`<path d="M8.5 11.5a3 3 0 0 0 4.2.3l2.3-2.3a3 3 0 0 0-4.2-4.2L9.6 6.5" ${STROKE}/><path d="M11.5 8.5a3 3 0 0 0-4.2-.3L5 10.5a3 3 0 0 0 4.2 4.2l1.2-1.2" ${STROKE}/>`),
  specialCharacter: s(`<path d="M5 15h2.2a5 5 0 1 1 5.6 0H15" ${STROKE}/><line x1="4.3" y1="15" x2="6.4" y2="15" ${STROKE}/><line x1="13.6" y1="15" x2="15.7" y2="15" ${STROKE}/>`),
  indent: s(`<line x1="9" y1="4" x2="17" y2="4" ${STROKE}/><line x1="9" y1="10" x2="17" y2="10" ${STROKE}/><line x1="9" y1="16" x2="17" y2="16" ${STROKE}/><path d="M3 7l3 3-3 3" ${STROKE}/>`),
  outdent: s(`<line x1="9" y1="4" x2="17" y2="4" ${STROKE}/><line x1="9" y1="10" x2="17" y2="10" ${STROKE}/><line x1="9" y1="16" x2="17" y2="16" ${STROKE}/><path d="M6 7l-3 3 3 3" ${STROKE}/>`),
  alignLeft: s(`<line x1="3" y1="5" x2="17" y2="5" ${STROKE}/><line x1="3" y1="9" x2="12" y2="9" ${STROKE}/><line x1="3" y1="13" x2="17" y2="13" ${STROKE}/><line x1="3" y1="17" x2="12" y2="17" ${STROKE}/>`),
  alignCenter: s(`<line x1="3" y1="5" x2="17" y2="5" ${STROKE}/><line x1="5.5" y1="9" x2="14.5" y2="9" ${STROKE}/><line x1="3" y1="13" x2="17" y2="13" ${STROKE}/><line x1="5.5" y1="17" x2="14.5" y2="17" ${STROKE}/>`),
  alignRight: s(`<line x1="3" y1="5" x2="17" y2="5" ${STROKE}/><line x1="8" y1="9" x2="17" y2="9" ${STROKE}/><line x1="3" y1="13" x2="17" y2="13" ${STROKE}/><line x1="8" y1="17" x2="17" y2="17" ${STROKE}/>`),
  alignJustify: s(`<line x1="3" y1="5" x2="17" y2="5" ${STROKE}/><line x1="3" y1="9" x2="17" y2="9" ${STROKE}/><line x1="3" y1="13" x2="17" y2="13" ${STROKE}/><line x1="3" y1="17" x2="17" y2="17" ${STROKE}/>`),
  color: s(`<path d="M12 3l4.5 4.5-7 7-4.8 1 1-4.8z" ${STROKE}/><path d="M5.3 14.7l-2.6 2.6" ${STROKE}/><rect x="2.5" y="17.3" width="14" height="2" fill="currentColor"/>`),
  rowAbove: s(`<line x1="3" y1="14" x2="17" y2="14" ${STROKE}/><line x1="3" y1="17" x2="17" y2="17" ${STROKE}/><path d="M10 3v6M7.3 6.3L10 3.5l2.7 2.8" ${STROKE}/>`),
  rowBelow: s(`<line x1="3" y1="3" x2="17" y2="3" ${STROKE}/><line x1="3" y1="6" x2="17" y2="6" ${STROKE}/><path d="M10 11v6M7.3 13.7L10 16.5l2.7-2.8" ${STROKE}/>`),
  rowDelete: s(`<line x1="3" y1="7" x2="17" y2="7" ${STROKE}/><line x1="3" y1="13" x2="17" y2="13" ${STROKE}/><path d="M8 7l4 6M12 7l-4 6" ${STROKE}/>`),
  colLeft: s(`<line x1="14" y1="3" x2="14" y2="17" ${STROKE}/><line x1="17" y1="3" x2="17" y2="17" ${STROKE}/><path d="M3 10h6M6.3 7.3L3.5 10l2.8 2.7" ${STROKE}/>`),
  colRight: s(`<line x1="3" y1="3" x2="3" y2="17" ${STROKE}/><line x1="6" y1="3" x2="6" y2="17" ${STROKE}/><path d="M11 10h6M13.7 7.3L16.5 10l-2.8 2.7" ${STROKE}/>`),
  colDelete: s(`<line x1="7" y1="3" x2="7" y2="17" ${STROKE}/><line x1="13" y1="3" x2="13" y2="17" ${STROKE}/><path d="M7 8l6 4M13 8l-6 4" ${STROKE}/>`),
  tableHeader: s(`<rect x="3" y="3" width="14" height="14" rx="1" ${STROKE}/><rect x="3.7" y="3.7" width="12.6" height="4" fill="currentColor" opacity="0.35"/><line x1="3" y1="12" x2="17" y2="12" ${STROKE}/><line x1="9" y1="7.7" x2="9" y2="17" ${STROKE}/>`),
  tableDelete: s(`<rect x="2" y="2" width="12" height="12" rx="1" ${STROKE}/><line x1="2" y1="8" x2="14" y2="8" ${STROKE}/><line x1="8" y1="2" x2="8" y2="14" ${STROKE}/><path d="M12.5 12.5l5 5M17.5 12.5l-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`),
  mergeRight: s(`<rect x="2" y="5" width="7" height="10" ${STROKE}/><rect x="11" y="5" width="7" height="10" ${STROKE}/><path d="M7 10h6M10.5 7l3 3-3 3" ${STROKE}/>`),
  mergeDown: s(`<rect x="5" y="2" width="10" height="7" ${STROKE}/><rect x="5" y="11" width="10" height="7" ${STROKE}/><path d="M10 7v6M7 10.5l3 3 3-3" ${STROKE}/>`),
  splitVertical: s(`<rect x="3" y="3" width="14" height="14" rx="1" ${STROKE}/><line x1="10" y1="3.5" x2="10" y2="16.5" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.2 2.2"/>`),
  splitHorizontal: s(`<rect x="3" y="3" width="14" height="14" rx="1" ${STROKE}/><line x1="3.5" y1="10" x2="16.5" y2="10" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.2 2.2"/>`),
  emptyCell: s(`<rect x="3" y="3" width="14" height="14" rx="1" ${STROKE}/><path d="M7 7l6 6M13 7l-6 6" ${STROKE}/>`),
  undo: s(`<path d="M5 8H13a4 4 0 0 1 0 8h-2" ${STROKE}/><path d="M8 4L4 8l4 4" ${STROKE}/>`),
  redo: s(`<path d="M15 8H7a4 4 0 0 0 0 8h2" ${STROKE}/><path d="M12 4l4 4-4 4" ${STROKE}/>`),
  find: s(`<circle cx="8.5" cy="8.5" r="5" ${STROKE}/><line x1="12.5" y1="12.5" x2="17" y2="17" ${STROKE}/>`),
  code: s(`<rect x="2" y="3" width="16" height="14" rx="1.5" ${STROKE}/><path d="M7 8l-2.5 2 2.5 2M13 8l2.5 2-2.5 2" ${STROKE}/>`),
  sourceCode: s(`<path d="M7 6L2.5 10 7 14M13 6l4.5 4-4.5 4" ${STROKE}/>`),
  fullscreen: s(`<path d="M3 8V4h4M17 8V4h-4M3 12v4h4M17 12v4h-4" ${STROKE}/>`),
  preview: s(`<path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" ${STROKE}/><circle cx="10" cy="10" r="2.3" ${STROKE}/>`),
  print: s(`<rect x="5" y="7" width="10" height="6" ${STROKE}/><path d="M5 8V3h10v5M6 13v4h8v-4" ${STROKE}/>`),
  download: s(`<path d="M10 3v10M6.3 9.3L10 13l3.7-3.7" ${STROKE}/><path d="M4 15v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" ${STROKE}/>`),
  lock: s(`<rect x="4" y="9" width="12" height="8" rx="1.5" ${STROKE}/><path d="M7 9V6a3 3 0 0 1 6 0v3" ${STROKE}/><circle cx="10" cy="13" r="1.1" fill="currentColor"/>`),
  alert: s(`<path d="M10 3l8 14H2z" ${STROKE}/><line x1="10" y1="8.3" x2="10" y2="12" ${STROKE}/><circle cx="10" cy="14.6" r="0.9" fill="currentColor"/>`),
  about: s(`<circle cx="10" cy="10" r="7.5" ${STROKE}/><text x="7.6" y="14.5" font-size="11" font-weight="600" fill="currentColor">?</text>`),
  // Theme toggle — shows the icon for what you'd switch TO, same
  // convention as most editors/OSes (a sun button while dark, a moon
  // button while light).
  sunTheme: s(`<circle cx="10" cy="10" r="3.3" ${STROKE}/><path d="M10 2.3v2.1M10 15.6v2.1M17.7 10h-2.1M4.4 10H2.3M15.4 4.6l-1.5 1.5M6.1 13.9l-1.5 1.5M15.4 15.4l-1.5-1.5M6.1 6.1L4.6 4.6" ${STROKE}/>`),
  moonTheme: s(`<path d="M17 12.3A7.3 7.3 0 1 1 7.7 3a5.8 5.8 0 0 0 9.3 9.3z" ${STROKE}/>`),
  emoji: s(`<circle cx="10" cy="10" r="7.5" ${STROKE}/><circle cx="7.2" cy="8.3" r="1.1" fill="currentColor"/><circle cx="12.8" cy="8.3" r="1.1" fill="currentColor"/><path d="M6.2 12.1a4.6 4.6 0 0 0 7.6 0" ${STROKE}/>`),
  // Added for the media/link "edit in place" affordances (MediaTools,
  // LinkTools) and the media drag-to-reposition handle.
  edit: s(`<path d="M13.5 3.5a2 2 0 0 1 2.8 2.8L7 15.6l-3.5.9.9-3.5 9.1-9.1z" ${STROKE}/>`),
  unlink: s(`<path d="M8.5 11.5a3 3 0 0 0 4.2.3l1-1M11.5 8.5a3 3 0 0 0-4.2-.3l-1 1" ${STROKE}/><path d="M3 3l14 14" ${STROKE}/>`),
  move: s(`<path d="M10 2.5v15M2.5 10h15" ${STROKE}/><path d="M10 2.5l-2.3 2.3M10 2.5l2.3 2.3M10 17.5l-2.3-2.3M10 17.5l2.3-2.3M2.5 10l2.3-2.3M2.5 10l2.3 2.3M17.5 10l-2.3-2.3M17.5 10l-2.3 2.3" ${STROKE}/>`),
};

export default ICONS;
