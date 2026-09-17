import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';

/**
 * Used for every assigned-approver decision: Editorial/Review's Approve/
 * Reject, and Publication's Publish/Unpublish (same APPROVED/REJECTED
 * values under the hood - see publication.api.js - just relabelled here
 * to say what they actually do). `pendingAction` tracks which button was
 * pressed so only that one shows a loading state.
 */
export default function ApproverActionModal({ open, onClose, title, description, approveLabel = 'Approve', rejectLabel = 'Reject', onSubmit }) {
  const [comments, setComments] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const toast = useToast();

  async function handle(action) {
    setPendingAction(action);
    try {
      await onSubmit(action, comments.trim() || undefined);
      setComments('');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <label className="mb-1.5 block text-sm font-medium text-ink-800">Comments (optional)</label>
      <textarea
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100"
        placeholder="Add a note for the author…"
      />
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="danger" onClick={() => handle('REJECTED')} disabled={Boolean(pendingAction)}>
          {pendingAction === 'REJECTED' ? 'Submitting…' : rejectLabel}
        </Button>
        <Button onClick={() => handle('APPROVED')} disabled={Boolean(pendingAction)}>
          {pendingAction === 'APPROVED' ? 'Submitting…' : approveLabel}
        </Button>
      </div>
    </Modal>
  );
}
