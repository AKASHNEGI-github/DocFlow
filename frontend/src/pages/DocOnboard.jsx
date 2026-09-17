import { useNavigate } from 'react-router-dom';
import { documentsApi } from '../api/documents.api.js';
import DocumentForm from '../components/documents/DocumentForm.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function DocOnboard() {
  const navigate = useNavigate();
  const toast = useToast();

  async function handleSubmit(data) {
    await documentsApi.create(data);
    toast('Document created.');
    navigate('/draft');
  }

  return (
    <div className="max-w-6xl">
      <p className="mb-6 text-sm text-ink-500">Give your document a category and title, write the content, and it'll land in Draft.</p>
      <div className="rounded-xl border border-ink-200/70 bg-paper-raised p-6">
        <DocumentForm submitLabel="Create document" onSubmit={handleSubmit} onCancel={() => navigate('/draft')} />
      </div>
    </div>
  );
}
