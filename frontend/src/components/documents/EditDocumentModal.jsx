import Modal from '../ui/Modal.jsx';
import DocumentForm from './DocumentForm.jsx';
import { documentsApi } from '../../api/documents.api.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function EditDocumentModal({ document, open, onClose, onSaved }) {
  const toast = useToast();
  if (!document) return null;

  async function handleSubmit({ title, content }) {
    const updated = await documentsApi.update(document.documentId, { title, content });
    toast('Document updated.');
    onSaved?.(updated);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit document" width="max-w-3xl">
      <DocumentForm
        initialCategory={document.category}
        initialTitle={document.title}
        initialContent={document.content}
        categoryEditable={false}
        submitLabel="Save changes"
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}
