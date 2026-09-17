import { useEffect, useState } from 'react';
import { Eye, Pencil, Trash2, ArrowUpCircle, XCircle, CheckCircle2, Slash } from 'lucide-react';
import { reviewApi } from '../api/review.api.js';
import { editorialApi } from '../api/editorial.api.js';
import { documentsApi } from '../api/documents.api.js';
import DataTable from '../components/ui/DataTable.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import IconButton from '../components/ui/IconButton.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import FilterPanel, { DEFAULT_FILTERS } from '../components/ui/FilterPanel.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import { StageBadge, StatusBadge } from '../components/ui/Badge.jsx';
import DocumentDetailModal from '../components/documents/DocumentDetailModal.jsx';
import EditDocumentModal from '../components/documents/EditDocumentModal.jsx';
import PromoteModal from '../components/documents/PromoteModal.jsx';
import ApproverActionModal from '../components/documents/ApproverActionModal.jsx';
import { formatDate } from '../lib/date.js';
import { matchesFilters } from '../lib/filters.js';
import { sortRows } from '../lib/sort.js';
import { useToast } from '../context/ToastContext.jsx';
import { usePageCount } from '../context/PageMetaContext.jsx';
import { RE_PROMOTABLE } from '../lib/constants.js';

export default function Review() {
  const [tab, setTab] = useState('mine');
  const [mine, setMine] = useState(null);
  const [forApproval, setForApproval] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const toast = useToast();

  async function load() {
    try {
      const [a, b] = await Promise.all([reviewApi.myRequests(), reviewApi.forApproval()]);
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
  const sortFields = { name: 'title', created: tab === 'mine' ? 'createdAt' : 'requestedAt', updated: 'updatedAt' };
  const filtered = sortRows(
    rows
      .filter((r) => matchesFilters(r, filters))
      .filter((r) => r.title.toLowerCase().includes(query.toLowerCase()) || r.category.toLowerCase().includes(query.toLowerCase())),
    filters.sort,
    sortFields,
  );

  usePageCount(mine === null ? null : filtered.length);

  if (mine === null) return <p className="text-sm text-ink-500">Loading…</p>;

  return (
    <div>
      <p className="mb-5 max-w-2xl text-sm text-ink-500">
        Documents move here once an editor approves. A reviewer confirms only (no editing) - Approve moves a document on to Publication; Reject sends it back to Editorial.
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
        <SearchBar value={query} onChange={setQuery} />
        <FilterPanel value={filters} onChange={setFilters} sortFields={sortFields} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nothing here" description={tab === 'mine' ? 'Promote an approved document from Editorial to see it here.' : 'Requests assigned to you as a reviewer will show up here.'} />
      ) : tab === 'mine' ? (
        <DataTable
          rowKey={(r) => r.documentId}
          rows={filtered}
          columns={[
            { key: 'title', header: 'Document', render: (r) => <span className="font-medium text-ink-900">{r.title}</span> },
            { key: 'category', header: 'Category' },
            { key: 'stage', header: 'Stage', render: (r) => <StageBadge stage={r.stage} /> },
            { key: 'requestStatus', header: 'Status', render: (r) => <StatusBadge status={r.requestStatus} /> },
            { key: 'approvers', header: 'Assigned Reviewer(s)', render: (r) => (r.approvers || []).map((a) => a.fullName).join(', ') },
            { key: 'createdAt', header: 'Created', render: (r) => formatDate(r.createdAt) },
          ]}
          actions={(r) => (
            <>
              <IconButton icon={Eye} label="View" onClick={() => setModal({ type: 'view', doc: r })} />
              {r.requestStatus === 'PENDING' && <IconButton icon={XCircle} label="Cancel" variant="danger" onClick={() => setModal({ type: 'cancel', doc: r })} />}
              {r.requestStatus === 'APPROVED' && (
                <>
                  <IconButton icon={ArrowUpCircle} label="Promote to Publication" variant="accent" onClick={() => setModal({ type: 'promote', doc: r })} />
                  <IconButton icon={Trash2} label="Delete" variant="danger" onClick={() => setModal({ type: 'delete', doc: r })} />
                </>
              )}
              {RE_PROMOTABLE.includes(r.requestStatus) && (
                <>
                  <IconButton icon={Pencil} label="Edit" onClick={() => setModal({ type: 'edit', doc: r })} />
                  <IconButton icon={ArrowUpCircle} label="Promote again" variant="accent" onClick={() => setModal({ type: 'repromote', doc: r })} />
                  <IconButton icon={Trash2} label="Delete" variant="danger" onClick={() => setModal({ type: 'delete', doc: r })} />
                </>
              )}
            </>
          )}
        />
      ) : (
        <DataTable
          rowKey={(r) => r.reviewRequestId}
          rows={filtered}
          columns={[
            { key: 'title', header: 'Document', render: (r) => <span className="font-medium text-ink-900">{r.title}</span> },
            { key: 'category', header: 'Category' },
            { key: 'stage', header: 'Stage', render: (r) => <StageBadge stage={r.stage} /> },
            { key: 'requestStatus', header: 'Status', render: (r) => <StatusBadge status={r.requestStatus} /> },
            { key: 'author', header: 'Assigned By', render: (r) => r.author?.fullName },
            { key: 'requestedAt', header: 'Requested', render: (r) => formatDate(r.requestedAt) },
          ]}
          actions={(r) =>
            r.requestStatus === 'PENDING' ? (
              <>
                <IconButton icon={Eye} label="View" onClick={() => setModal({ type: 'view', doc: r })} />
                <IconButton icon={CheckCircle2} label="Decide" variant="accent" onClick={() => setModal({ type: 'action', doc: r })} />
              </>
            ) : (
              <span className="flex items-center gap-1 text-xs text-ink-400">
                <Slash size={12} /> Already resolved
              </span>
            )
          }
        />
      )}

      <DocumentDetailModal documentId={modal?.doc?.documentId} open={modal?.type === 'view'} onClose={() => setModal(null)} />
      <EditDocumentModal document={modal?.type === 'edit' ? modal.doc : null} open={modal?.type === 'edit'} onClose={() => setModal(null)} onSaved={load} />

      <PromoteModal
        open={modal?.type === 'promote'}
        onClose={() => setModal(null)}
        title="Promote to Publication"
        description="Select one or more publishers."
        fetchOptions={reviewApi.listPublishers}
        submitLabel="Promote"
        onSubmit={async (publisherIds) => {
          await reviewApi.promote(modal.doc.documentId, publisherIds);
          toast('Promoted for publication.');
          load();
        }}
      />

      <PromoteModal
        open={modal?.type === 'repromote'}
        onClose={() => setModal(null)}
        title="Promote again"
        description="Select one or more reviewers for a fresh review."
        fetchOptions={editorialApi.listReviewers}
        defaultSelected={(modal?.doc?.approvers || []).map((a) => a.userId)}
        submitLabel="Promote again"
        onSubmit={async (reviewerIds) => {
          await reviewApi.repromote(modal.doc.documentId, reviewerIds);
          toast('Re-raised for review.');
          load();
        }}
      />

      <ApproverActionModal
        open={modal?.type === 'action'}
        onClose={() => setModal(null)}
        title="Review decision"
        description={`Approve to move "${modal?.doc?.title}" on to Publication, or Reject to send it back to Editorial.`}
        onSubmit={async (action, comments) => {
          await reviewApi.action(modal.doc.documentId, action, comments);
          toast(action === 'APPROVED' ? 'Approved.' : 'Rejected.');
          load();
        }}
      />

      <ConfirmDialog
        open={modal?.type === 'cancel'}
        onClose={() => setModal(null)}
        title="Cancel this request?"
        description="The document will return to Editorial."
        confirmLabel="Cancel request"
        onConfirm={async () => {
          await reviewApi.cancel(modal.doc.documentId);
          toast('Request cancelled.');
          load();
        }}
      />

      <ConfirmDialog
        open={modal?.type === 'delete'}
        onClose={() => setModal(null)}
        title="Delete this document?"
        description={`"${modal?.doc?.title}" will be permanently deleted.`}
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
