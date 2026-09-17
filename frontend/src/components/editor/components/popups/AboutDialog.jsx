export default function AboutDialog({ onClose }) {
  return (
    <div>
      <h3 className="jc-form-title">About this editor</h3>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--jc-text-muted)', margin: '0 0 16px' }}>
        A from-scratch rich text editor built in React. No editor
        dependency — every plugin here, from the core engine to the
        toolbar icons, is our own code.
      </p>
      <div className="jc-form-actions">
        <button type="button" className="jc-btn-primary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
