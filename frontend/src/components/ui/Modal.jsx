import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, description, children, width = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} />
      <div className={`relative w-full ${width} rounded-2xl bg-paper-raised shadow-xl thin-scroll max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-start justify-between gap-4 border-b border-ink-200/70 px-6 py-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink-600">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-ink-400 hover:bg-paper-sunken hover:text-ink-700" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
