import { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { StatusBadge } from '../ui/Badge.jsx';
import StageTracker from './StageTracker.jsx';
import DocumentContentViewer from './DocumentContentViewer.jsx';
import { documentsApi } from '../../api/documents.api.js';
import { formatDateTime } from '../../lib/date.js';
import { stageMeta } from '../../lib/status.js';
import { useToast } from '../../context/ToastContext.jsx';

/**
 * The single "View" surface reused by every phase list in the app - see
 * documentsService.getById on the backend for the visibility rule
 * (Live is public; anything else requires being the owner or an
 * assigned approver, enforced server-side, not just hidden in the UI).
 */
export default function DocumentDetailModal({ documentId, open, onClose }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (!open || !documentId) return;
    setLoading(true);
    documentsApi
      .getById(documentId)
      .then(setDoc)
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentId]);

  return (
    <Modal open={open} onClose={onClose} title={loading ? 'Loading…' : doc?.title || 'Document'} width="max-w-4xl">
      {loading || !doc ? (
        <p className="py-10 text-center text-sm text-ink-500">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-ink-500">
            <span>
              Category <span className="font-medium text-ink-800">{doc.category}</span>
            </span>
            <span>
              Version <span className="font-mono font-medium text-ink-800">V{doc.versionNo}</span>
            </span>
            {doc.author && <span>By {doc.author.fullName}</span>}
            {doc.latestStatus && doc.latestStatus !== 'NONE' && <StatusBadge status={doc.latestStatus} />}
          </div>

          <StageTracker stage={doc.stage} />

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Content</p>
            <div className="thin-scroll max-h-[28rem] overflow-y-auto rounded-lg border border-ink-200 bg-paper-sunken/40 p-5 text-base text-ink-800">
              <DocumentContentViewer content={doc.content} id={doc.documentId} />
            </div>
          </div>

          {doc.stageHistory?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Stage history</p>
              <ol className="space-y-2.5 border-l-2 border-ink-100 pl-4">
                {doc.stageHistory.map((h, i) => (
                  <li key={`${h.actionAt}-${i}`} className="relative text-sm">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-accent-600 bg-paper-raised" />
                    <span className="font-medium text-ink-800">
                      {stageMeta(h.fromStage).label} → {stageMeta(h.toStage).label}
                    </span>{' '}
                    <StatusBadge status={h.newStatus} />
                    <p className="text-xs text-ink-500">
                      {h.actionBy.fullName} · {formatDateTime(h.actionAt)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
