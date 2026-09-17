import { useEffect, useState } from 'react';
import { Globe2, Eye, RefreshCw, Trash2 } from 'lucide-react';
import { liveApi } from '../api/live.api.js';
import DataTable from '../components/ui/DataTable.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import IconButton from '../components/ui/IconButton.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import FilterPanel, { DEFAULT_FILTERS } from '../components/ui/FilterPanel.jsx';
import DocumentDetailModal from '../components/documents/DocumentDetailModal.jsx';
import UpgradeModal from '../components/documents/UpgradeModal.jsx';
import DeletionRequestModal from '../components/documents/DeletionRequestModal.jsx';
import { StageBadge } from '../components/ui/Badge.jsx';
import { formatDate } from '../lib/date.js';
import { sortRows } from '../lib/sort.js';
import { useToast } from '../context/ToastContext.jsx';
import { usePageCount } from '../context/PageMetaContext.jsx';

// document_live only ever tracks publishedAt (see database/knex/migrations/
// 008_create_document_live.js) - no separate created/updated timestamps -
// so "Created" here is publishedAt and "Updated" is left out of the menu
// entirely rather than pointing at the same field a second time.
const LIVE_SORT_FIELDS = { name: 'title', created: 'publishedAt' };

export default function Live() {
  const [docs, setDocs] = useState(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [modal, setModal] = useState(null);
  const toast = useToast();

  async function load() {
    try {
      setDocs(await liveApi.listMine());
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
    LIVE_SORT_FIELDS,
  );

  usePageCount(docs === null ? null : filtered.length);

  if (docs === null) return <p className="text-sm text-ink-500">Loading…</p>;

  return (
    <div>
      <p className="mb-6 max-w-2xl text-sm text-ink-500">Your own documents that are currently live.</p>

      {docs.length === 0 ? (
        <EmptyState icon={Globe2} title="Nothing of yours is live yet" description="Documents you author will show up here once published." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <SearchBar value={query} onChange={setQuery} />
            <FilterPanel value={filters} onChange={setFilters} withStatus={false} sortFields={LIVE_SORT_FIELDS} />
          </div>
          <DataTable
            rowKey={(r) => r.documentId}
            rows={filtered}
            columns={[
              { key: 'title', header: 'Document', render: (r) => <span className="font-medium text-ink-900">{r.title}</span> },
              { key: 'category', header: 'Category' },
              { key: 'stage', header: 'Stage', render: () => <StageBadge stage="LIVE" /> },
              { key: 'versionNo', header: 'Version', render: (r) => <span className="font-mono text-xs">V{r.versionNo}</span> },
              { key: 'publishedAt', header: 'Published', render: (r) => formatDate(r.publishedAt) },
            ]}
            actions={(r) => (
              <>
                <IconButton icon={Eye} label="View" onClick={() => setModal({ type: 'view', doc: r })} />
                <IconButton icon={RefreshCw} label="Upgrade" variant="accent" onClick={() => setModal({ type: 'upgrade', doc: r })} />
                <IconButton icon={Trash2} label="Request deletion" variant="danger" onClick={() => setModal({ type: 'delete', doc: r })} />
              </>
            )}
          />
        </>
      )}

      <DocumentDetailModal documentId={modal?.doc?.documentId} open={modal?.type === 'view'} onClose={() => setModal(null)} />
      <UpgradeModal document={modal?.type === 'upgrade' ? modal.doc : null} open={modal?.type === 'upgrade'} onClose={() => setModal(null)} />
      <DeletionRequestModal
        document={modal?.type === 'delete' ? modal.doc : null}
        open={modal?.type === 'delete'}
        onClose={() => setModal(null)}
        onRequested={load}
      />
    </div>
  );
}
