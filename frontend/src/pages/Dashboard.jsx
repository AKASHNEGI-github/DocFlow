import { useEffect, useState } from 'react';
import { LayoutDashboard, Eye } from 'lucide-react';
import { documentsApi } from '../api/documents.api.js';
import DataTable from '../components/ui/DataTable.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import IconButton from '../components/ui/IconButton.jsx';
import { StatusBadge, StageBadge } from '../components/ui/Badge.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import FilterPanel, { DEFAULT_FILTERS } from '../components/ui/FilterPanel.jsx';
import DocumentDetailModal from '../components/documents/DocumentDetailModal.jsx';
import { formatDate } from '../lib/date.js';
import { matchesFilters } from '../lib/filters.js';
import { sortRows } from '../lib/sort.js';
import { useToast } from '../context/ToastContext.jsx';
import { usePageCount } from '../context/PageMetaContext.jsx';

export default function Dashboard() {
  const [docs, setDocs] = useState(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [openId, setOpenId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    documentsApi.listMine().then(setDocs).catch((err) => toast(err.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = sortRows(
    (docs || [])
      .filter((d) => d.title.toLowerCase().includes(query.toLowerCase()) || d.category.toLowerCase().includes(query.toLowerCase()))
      .filter((d) => matchesFilters(d, filters, { statusField: 'latestStatus' })),
    filters.sort,
  );

  usePageCount(docs === null ? null : filtered.length);

  if (docs === null) return <p className="text-sm text-ink-500">Loading…</p>;

  return (
    <div>
      <p className="mb-6 max-w-2xl text-sm text-ink-500">Every document you've created, at every stage. View-only - use the phase pages to act on one.</p>

      {docs.length === 0 ? (
        <EmptyState icon={LayoutDashboard} title="No documents yet" description="Create your first document from Doc Onboard." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <SearchBar value={query} onChange={setQuery} />
            <FilterPanel value={filters} onChange={setFilters} />
          </div>
          <DataTable
            rowKey={(r) => r.documentId}
            rows={filtered}
            onRowClick={(r) => setOpenId(r.documentId)}
            columns={[
              { key: 'title', header: 'Title', render: (r) => <span className="font-medium text-ink-900">{r.title}</span> },
              { key: 'category', header: 'Category' },
              { key: 'stage', header: 'Stage', render: (r) => <StageBadge stage={r.stage} /> },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.latestStatus || 'NONE'} /> },
              { key: 'version', header: 'Version', render: (r) => <span className="font-mono text-xs">V{r.versionNo}</span> },
              { key: 'createdAt', header: 'Created', render: (r) => formatDate(r.createdAt) },
            ]}
            actions={(r) => <IconButton icon={Eye} label="View" onClick={() => setOpenId(r.documentId)} />}
          />
        </>
      )}

      <DocumentDetailModal documentId={openId} open={Boolean(openId)} onClose={() => setOpenId(null)} />
    </div>
  );
}
