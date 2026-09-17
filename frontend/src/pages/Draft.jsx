import { useEffect, useState } from 'react';
import { FileText, Eye, Pencil, Trash2, ArrowUpCircle } from 'lucide-react';
import { draftApi } from '../api/draft.api.js';
import { documentsApi } from '../api/documents.api.js';
import DataTable from '../components/ui/DataTable.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import IconButton from '../components/ui/IconButton.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import FilterPanel, { DEFAULT_FILTERS } from '../components/ui/FilterPanel.jsx';
import Button from '../components/ui/Button.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import DocumentDetailModal from '../components/documents/DocumentDetailModal.jsx';
import EditDocumentModal from '../components/documents/EditDocumentModal.jsx';
import PromoteModal from '../components/documents/PromoteModal.jsx';
import { StageBadge, StatusBadge } from '../components/ui/Badge.jsx';
import { formatDate } from '../lib/date.js';
import { sortRows } from '../lib/sort.js';
import { useToast } from '../context/ToastContext.jsx';
import { usePageCount } from '../context/PageMetaContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function Draft() {
  const [docs, setDocs] = useState(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [modal, setModal] = useState(null); // { type: 'view'|'edit'|'delete'|'promote', doc }
  const toast = useToast();
  const navigate = useNavigate();

  async function load() {
    try {
      setDocs(await draftApi.listMine());
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = sortRows(
    (docs || []).filter((d) => d.title.toLowerCase().includes(query.toLowerCase()) || d.category.toLowerCase().includes(query.toLowerCase())),
    filters.sort,
  );

  usePageCount(docs === null ? null : filtered.length);

  if (docs === null) return <p className="text-sm text-ink-500">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="max-w-2xl text-sm text-ink-500">Documents you've created that haven't been promoted yet.</p>
        <Button size="sm" onClick={() => navigate('/doc-onboard')}>
          + New Document
        </Button>
      </div>

      {docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="You haven't created any documents yet"
          action={
            <Button size="sm" onClick={() => navigate('/doc-onboard')}>
              Create Document
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <SearchBar value={query} onChange={setQuery} />
            <FilterPanel value={filters} onChange={setFilters} withStatus={false} />
          </div>
          <DataTable
            rowKey={(r) => r.documentId}
            rows={filtered}
            columns={[
              { key: 'title', header: 'Document', render: (r) => <span className="font-medium text-ink-900">{r.title}</span> },
              { key: 'category', header: 'Category' },
              { key: 'stage', header: 'Stage', render: (r) => <StageBadge stage={r.stage} /> },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.latestStatus || 'NONE'} /> },
              { key: 'versionNo', header: 'Version', render: (r) => <span className="font-mono text-xs">V{r.versionNo}</span> },
              { key: 'createdAt', header: 'Created', render: (r) => formatDate(r.createdAt) },
            ]}
            actions={(r) => (
              <>
                <IconButton icon={Eye} label="View" onClick={() => setModal({ type: 'view', doc: r })} />
                <IconButton icon={Pencil} label="Edit" onClick={() => setModal({ type: 'edit', doc: r })} />
                <IconButton icon={ArrowUpCircle} label="Promote" variant="accent" onClick={() => setModal({ type: 'promote', doc: r })} />
                <IconButton icon={Trash2} label="Delete" variant="danger" onClick={() => setModal({ type: 'delete', doc: r })} />
              </>
            )}
          />
        </>
      )}

      <DocumentDetailModal documentId={modal?.type === 'view' ? modal.doc.documentId : null} open={modal?.type === 'view'} onClose={() => setModal(null)} />

      <EditDocumentModal document={modal?.type === 'edit' ? modal.doc : null} open={modal?.type === 'edit'} onClose={() => setModal(null)} onSaved={load} />

      <PromoteModal
        open={modal?.type === 'promote'}
        onClose={() => setModal(null)}
        title="Promote to Editorial"
        description="Select one or more editors to review this document."
        fetchOptions={draftApi.listEditors}
        submitLabel="Promote"
        onSubmit={async (editorIds) => {
          await draftApi.promote(modal.doc.documentId, editorIds);
          toast('Promoted for editorial review.');
          load();
        }}
      />

      <ConfirmDialog
        open={modal?.type === 'delete'}
        onClose={() => setModal(null)}
        title="Delete this document?"
        description={`"${modal?.doc?.title}" will be permanently deleted. This can't be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async () => {
          await documentsApi.remove(modal.doc.documentId);
          toast('Document deleted.');
          load();
        }}
      />
    </div>
  );
}
