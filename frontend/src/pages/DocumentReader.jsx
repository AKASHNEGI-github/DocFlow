import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { documentsApi } from '../api/documents.api.js';
import { formatDate } from '../lib/date.js';
import { useToast } from '../context/ToastContext.jsx';
import DocumentContentViewer from '../components/documents/DocumentContentViewer.jsx';

/**
 * A dedicated, full-viewport route (outside AppLayout - no sidebar, no
 * topbar) rather than a bigger modal, specifically for the Home/Live
 * reading use case: browsing a published document should feel like
 * reading an article, with room to actually read it, not a workspace
 * panel. Deliberately doesn't show Stage History (unlike
 * DocumentDetailModal, used everywhere else) - internal workflow detail
 * doesn't belong on what's meant to read as a finished, published piece.
 * Works for any document the caller can access, not just Live ones -
 * documentsApi.getById already enforces that visibility server-side.
 */
export default function DocumentReader() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    documentsApi
      .getById(documentId)
      .then(setDoc)
      .catch((err) => {
        setError(err.message);
        toast(err.message, 'error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 border-b border-ink-200/70 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/home'))}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <Link to="/home" className="font-display text-sm font-semibold text-ink-900">
            DocFlow
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {error ? (
          <p className="text-sm text-status-rejected">{error}</p>
        ) : !doc ? (
          <p className="text-sm text-ink-500">Loading…</p>
        ) : (
          <article>
            <span className="mb-3 inline-flex items-center rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-medium text-accent-700">
              {doc.category}
            </span>
            <h1 className="font-display text-3xl font-semibold leading-tight text-ink-900 sm:text-4xl">{doc.title}</h1>
            <p className="mt-3 text-sm text-ink-500">
              {doc.author?.fullName ?? 'Unknown author'} · V{doc.versionNo} · {formatDate(doc.updatedAt || doc.createdAt)}
            </p>

            <div className="prose-reader mt-8 text-ink-800">
              <DocumentContentViewer content={doc.content} id={doc.documentId} />
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
