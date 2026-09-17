import { useState } from 'react';
import Button from '../ui/Button.jsx';
import DocumentEditorField from './DocumentEditorField.jsx';

/**
 * Shared by Doc Onboard (create - category editable, free text for now,
 * per the design decision to defer a managed category table) and every
 * edit entry point (category fixed/read-only once a document exists -
 * only title/content are ever editable after creation, whoever is
 * editing).
 */
export default function DocumentForm({
  initialCategory = '',
  initialTitle = '',
  initialContent = '',
  categoryEditable = true,
  submitLabel = 'Save',
  onSubmit,
  onCancel,
}) {
  const [category, setCategory] = useState(initialCategory);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!category.trim() || !title.trim()) {
      setError('Category and title are required.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ category: category.trim(), title: title.trim(), content });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-800">Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={!categoryEditable}
            placeholder="e.g. Engineering, Policy, Marketing"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100 disabled:bg-paper-sunken disabled:text-ink-500"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-800">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100"
          />
        </div>
      </div>

      <DocumentEditorField label="Content" value={content} onChange={setContent} />

      {error && <p className="text-sm text-status-rejected">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
