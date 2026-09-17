import { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import MultiSelect from '../ui/MultiSelect.jsx';
import { useToast } from '../../context/ToastContext.jsx';

/**
 * Used by every "assign approver(s)" action in the app: Draft's Promote
 * (editors), Editorial's Promote/Repromote (reviewers/editors), Review's
 * Promote/Repromote (publishers/reviewers), Publication's Repromote
 * (publishers). `fetchOptions` loads the picker list, `defaultSelected`
 * pre-fills a repromote's previous assignees as an editable starting
 * point (a frontend convenience only - the backend always raises a
 * brand-new request regardless of who ends up selected).
 */
export default function PromoteModal({ open, onClose, title, description, fetchOptions, defaultSelected = [], submitLabel, onSubmit }) {
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(defaultSelected);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    setSelected(defaultSelected);
    setLoading(true);
    fetchOptions()
      .then((people) => setOptions(people.map((p) => ({ value: p.userId, label: p.fullName }))))
      .catch(() => toast('Could not load the list of people.', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit() {
    if (selected.length === 0) return;
    setSubmitting(true);
    try {
      await onSubmit(selected);
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      {loading ? (
        <p className="py-6 text-center text-sm text-ink-500">Loading…</p>
      ) : (
        <MultiSelect options={options} selected={selected} onChange={setSelected} />
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || selected.length === 0}>
          {submitting ? 'Submitting…' : submitLabel}
        </Button>
      </div>
    </Modal>
  );
}
