import { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import MultiSelect from '../ui/MultiSelect.jsx';
import { usersApi } from '../../api/users.api.js';
import { deletionApi } from '../../api/deletion.api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { ROLES } from '../../lib/roles.js';

export default function DeletionRequestModal({ document, open, onClose, onRequested }) {
  const [reason, setReason] = useState('');
  const [editorId, setEditorId] = useState([]);
  const [reviewerId, setReviewerId] = useState([]);
  const [publisherId, setPublisherId] = useState([]);
  const [people, setPeople] = useState({ editors: [], reviewers: [], publishers: [] });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    setReason('');
    setEditorId([]);
    setReviewerId([]);
    setPublisherId([]);
    setLoading(true);
    Promise.all([usersApi.list(ROLES.EDITOR), usersApi.list(ROLES.REVIEWER), usersApi.list(ROLES.PUBLISHER)])
      .then(([editors, reviewers, publishers]) => setPeople({ editors, reviewers, publishers }))
      .catch(() => toast('Could not load approvers.', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canSubmit = reason.trim() && editorId[0] && reviewerId[0] && publisherId[0];

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await deletionApi.request(document.documentId, {
        reason: reason.trim(),
        editorId: editorId[0],
        reviewerId: reviewerId[0],
        publisherId: publisherId[0],
      });
      toast('Deletion requested.');
      onRequested?.();
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request deletion"
      description={`This will ask one editor, one reviewer, and one publisher to unanimously approve removing "${document?.title}" from Live.`}
      width="max-w-2xl"
    >
      {loading ? (
        <p className="py-6 text-center text-sm text-ink-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-800">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why should this document be removed?"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-800">Editor</label>
              <MultiSelect
                multiple={false}
                options={people.editors.map((p) => ({ value: p.userId, label: p.fullName }))}
                selected={editorId}
                onChange={setEditorId}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-800">Reviewer</label>
              <MultiSelect
                multiple={false}
                options={people.reviewers.map((p) => ({ value: p.userId, label: p.fullName }))}
                selected={reviewerId}
                onChange={setReviewerId}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-800">Publisher</label>
              <MultiSelect
                multiple={false}
                options={people.publishers.map((p) => ({ value: p.userId, label: p.fullName }))}
                selected={publisherId}
                onChange={setPublisherId}
              />
            </div>
          </div>
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleSubmit} disabled={submitting || !canSubmit}>
          {submitting ? 'Requesting…' : 'Request deletion'}
        </Button>
      </div>
    </Modal>
  );
}
