import { useEffect, useState } from 'react';
import { Eye, XCircle, CheckCircle2, Slash, RotateCcw } from 'lucide-react';
import { deletionApi } from '../api/deletion.api.js';
import DataTable from '../components/ui/DataTable.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import IconButton from '../components/ui/IconButton.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import FilterPanel, { DEFAULT_FILTERS } from '../components/ui/FilterPanel.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import { StageBadge, StatusBadge } from '../components/ui/Badge.jsx';
import DocumentDetailModal from '../components/documents/DocumentDetailModal.jsx';
import ApproverActionModal from '../components/documents/ApproverActionModal.jsx';
import DeletionRequestModal from '../components/documents/DeletionRequestModal.jsx';
import { formatDate } from '../lib/date.js';
import { matchesFilters } from '../lib/filters.js';
import { sortRows } from '../lib/sort.js';
import { useToast } from '../context/ToastContext.jsx';
import { usePageCount } from '../context/PageMetaContext.jsx';

function ApproverProgress({ approvers = [] }) {
  return (
    <div className="flex flex-col gap-0.5">
      {approvers.map((a) => (
        <span key={a.userId} className="text-xs">
          <span className="text-ink-500">{a.role.charAt(0) + a.role.slice(1).toLowerCase()}:</span>{' '}
          <span className="font-medium text-ink-800">{a.fullName}</span> <StatusBadge status={a.action} />
        </span>
      ))}
    </div>
  );
}

// Deletion's rows wrap the document under `row.document` rather than
// having flat title/updatedAt fields like every other list page, so
// these need accessor functions instead of plain string keys (see
// lib/sort.js). "Created" reads the deletion request's own requestedAt,
// not the document's original createdAt - same reasoning as the
// For Approval tabs elsewhere: what's relevant here is when this
// request appeared, not when the document was first authored.
const DELETION_SORT_FIELDS = {
  name: (r) => r.document.documentName,
  created: 'requestedAt',
  updated: (r) => r.document.updatedAt,
};

export default function Deletion() {
  const [tab, setTab] = useState('mine');
  const [mine, setMine] = useState(null);
  const [forApproval, setForApproval] = useState(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [modal, setModal] = useState(null);
  const toast = useToast();

  async function load() {
    try {
      const [a, b] = await Promise.all([deletionApi.myRequests(), deletionApi.forApproval()]);
      setMine(a);
      setForApproval(b);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = (tab === 'mine' ? mine : forApproval) || [];
  const filtered = sortRows(
    rows
      .filter((r) => r.document.documentName.toLowerCase().includes(query.toLowerCase()))
      .filter((r) => matchesFilters(r, filters, { statusField: 'status' })),
    filters.sort,
    DELETION_SORT_FIELDS,
  );

  usePageCount(mine === null ? null : filtered.length);

  if (mine === null) return <p className="text-sm text-ink-500">Loading…</p>;

  return (
    <div>
      <p className="mb-5 max-w-2xl text-sm text-ink-500">
        Removing a live document needs unanimous sign-off from one editor, one reviewer, and one publisher. A single Reject cancels the whole request.
      </p>

      <Tabs
        tabs={[
          { value: 'mine', label: 'My Requests', count: mine.length },
          { value: 'approval', label: 'Requests For Approval', count: forApproval?.length ?? 0 },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="my-4 flex flex-wrap gap-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by document title…" />
        <FilterPanel value={filters} onChange={setFilters} sortFields={DELETION_SORT_FIELDS} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nothing here" description={tab === 'mine' ? 'Request deletion of a live document to see it here.' : 'Deletion requests assigned to you will show up here.'} />
      ) : tab === 'mine' ? (
        <DataTable
          rowKey={(r) => r.deleteRequestId}
          rows={filtered}
          columns={[
            { key: 'title', header: 'Document', render: (r) => <span className="font-medium text-ink-900">{r.document.documentName}</span> },
            { key: 'stage', header: 'Stage', render: (r) => <StageBadge stage={r.document.stage} /> },
            { key: 'reason', header: 'Reason', render: (r) => <span className="line-clamp-1 max-w-xs text-ink-600">{r.reason}</span> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'approvers', header: 'Panel', render: (r) => <ApproverProgress approvers={r.approvers} /> },
            { key: 'requestedAt', header: 'Requested', render: (r) => formatDate(r.requestedAt) },
          ]}
          actions={(r) => (
            <>
              <IconButton icon={Eye} label="View" onClick={() => setModal({ type: 'view', row: r })} />
              {r.status === 'PENDING' && <IconButton icon={XCircle} label="Cancel" variant="danger" onClick={() => setModal({ type: 'cancel', row: r })} />}
              {r.status === 'REJECTED' && (
                <IconButton icon={RotateCcw} label="Request again" variant="accent" onClick={() => setModal({ type: 'request-again', row: r })} />
              )}
            </>
          )}
        />
      ) : (
        <DataTable
          rowKey={(r) => r.deleteRequestId}
          rows={filtered}
          columns={[
            { key: 'title', header: 'Document', render: (r) => <span className="font-medium text-ink-900">{r.document.documentName}</span> },
            { key: 'reason', header: 'Reason', render: (r) => <span className="line-clamp-1 max-w-xs text-ink-600">{r.reason}</span> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'author', header: 'Requested By', render: (r) => r.author?.fullName },
            { key: 'requestedAt', header: 'Requested', render: (r) => formatDate(r.requestedAt) },
          ]}
          actions={(r) =>
            r.status === 'PENDING' && r.myAction === 'PENDING' ? (
              <>
                <IconButton icon={Eye} label="View" onClick={() => setModal({ type: 'view', row: r })} />
                <IconButton icon={CheckCircle2} label="Vote" variant="accent" onClick={() => setModal({ type: 'action', row: r })} />
              </>
            ) : (
              <span className="flex items-center gap-1 text-xs text-ink-400">
                <Slash size={12} /> {r.myAction !== 'PENDING' ? 'You already voted' : 'Resolved'}
              </span>
            )
          }
        />
      )}

      <DocumentDetailModal documentId={modal?.row?.document?.documentId} open={modal?.type === 'view'} onClose={() => setModal(null)} />

      <ApproverActionModal
        open={modal?.type === 'action'}
        onClose={() => setModal(null)}
        title="Deletion vote"
        description={`All three approvers must Approve for "${modal?.row?.document?.documentName}" to be removed. A single Reject cancels the whole request.`}
        onSubmit={async (action, comments) => {
          const result = await deletionApi.action(modal.row.deleteRequestId, action, comments);
          toast(result.documentDeleted ? 'Deleted - unanimous approval reached.' : action === 'APPROVED' ? 'Vote recorded.' : 'Rejected - request cancelled.');
          load();
        }}
      />

      <ConfirmDialog
        open={modal?.type === 'cancel'}
        onClose={() => setModal(null)}
        title="Cancel this deletion request?"
        description="The document stays live and untouched."
        confirmLabel="Cancel request"
        onConfirm={async () => {
          await deletionApi.cancel(modal.row.deleteRequestId);
          toast('Deletion request cancelled.');
          load();
        }}
      />

      <DeletionRequestModal
        document={
          modal?.type === 'request-again'
            ? { documentId: modal.row.document.documentId, title: modal.row.document.documentName }
            : null
        }
        open={modal?.type === 'request-again'}
        onClose={() => setModal(null)}
        onRequested={load}
      />
    </div>
  );
}
