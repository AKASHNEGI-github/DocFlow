import { openPrintWindow } from '../../core/printUtils';

// Simple, single-view "what will this look like" preview — matching
// Jodit's own preview feature, which just shows the document, rather than
// simulating multiple screen sizes. The content reuses the exact same
// .jc-content class the live editor uses, so it's styled identically —
// same alert colors, same code syntax highlighting, same everything.
export default function PreviewDialog({ editor, onClose }) {
  const html = editor.getHTML();
  const text = editor.containerRef.current?.textContent || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="jc-preview">
      <div className="jc-preview-header">
        <h3 className="jc-form-title" style={{ margin: 0 }}>Preview</h3>
        <span className="jc-preview-meta">
          {words} word{words === 1 ? '' : 's'} &middot; {text.length} character{text.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="jc-preview-page-wrap">
        <div className="jc-preview-page">
          <div className="jc-content jc-preview-content" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>

      <div className="jc-form-actions">
        <button type="button" className="jc-btn-secondary" onClick={onClose}>Close</button>
        <button type="button" className="jc-btn-primary" onClick={() => openPrintWindow(html)}>Print</button>
      </div>
    </div>
  );
}
