import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal.jsx';
import DocumentForm from './DocumentForm.jsx';
import { liveApi } from '../../api/live.api.js';
import { useToast } from '../../context/ToastContext.jsx';

/** Category is fixed (carried over server-side); only title/content are editable here. */
export default function UpgradeModal({ document, open, onClose }) {
  const toast = useToast();
  const navigate = useNavigate();
  if (!document) return null;

  async function handleSubmit({ title, content }) {
    await liveApi.upgrade(document.documentId, { title, content });
    toast('New version created in Draft.');
    onClose();
    navigate('/draft');
  }

  return (
    <Modal open={open} onClose={onClose} title={`Upgrade "${document.title}"`} description={`Creates V${document.versionNo + 1} in Draft. The live document is unaffected until the new version is itself published.`} width="max-w-3xl">
      <DocumentForm
        initialCategory={document.category}
        initialTitle={document.title}
        initialContent={document.content}
        categoryEditable={false}
        submitLabel="Create new version"
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}
