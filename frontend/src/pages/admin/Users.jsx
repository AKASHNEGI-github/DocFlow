import { useEffect, useState } from 'react';
import { UserPlus, Pencil, Trash2 } from 'lucide-react';
import { adminApi } from '../../api/admin.api.js';
import DataTable from '../../components/ui/DataTable.jsx';
import IconButton from '../../components/ui/IconButton.jsx';
import Button from '../../components/ui/Button.jsx';
import Switch from '../../components/ui/Switch.jsx';
import SearchBar from '../../components/ui/SearchBar.jsx';
import FilterPanel, { DEFAULT_FILTERS } from '../../components/ui/FilterPanel.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { ROLE_LABELS } from '../../lib/roles.js';
import { formatDate } from '../../lib/date.js';
import { sortRows } from '../../lib/sort.js';
import { useToast } from '../../context/ToastContext.jsx';
import { usePageCount } from '../../context/PageMetaContext.jsx';

const ROLE_OPTIONS = ['author', 'editor', 'reviewer', 'publisher', 'admin'];
// Users has no updatedAt column at all (see admin.repository.js), so
// only Name/Created sort options are offered here - Updated is simply
// left out of the menu rather than shown pointing at nothing.
const USER_SORT_FIELDS = { name: 'fullName', created: 'createdAt' };

function UserFormModal({ open, onClose, onSaved, editingUser }) {
  const isEdit = Boolean(editingUser);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('author');
  const [ssoId, setSsoId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setFullName(editingUser?.fullName || '');
      setEmail(editingUser?.email || '');
      setPassword('');
      setRole(editingUser?.role || 'author');
      setSsoId(editingUser?.ssoId || '');
      setIsActive(editingUser?.isActive ?? true);
      setError('');
    }
  }, [open, editingUser]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isEdit) {
        await adminApi.updateUser(editingUser.userId, { fullName, email, ssoId: ssoId || null, isActive });
        if (role !== editingUser.role) await adminApi.updateRole(editingUser.userId, role);
        toast('User updated.');
      } else {
        await adminApi.createUser({ fullName, email, password, role, ssoId: ssoId || undefined });
        toast('User created.');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit user' : 'Add user'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-800">First & last name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-800">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100" />
        </div>
        {!isEdit && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-800">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-800">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100">
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-800">SSO ID (optional)</label>
            <input value={ssoId} onChange={(e) => setSsoId(e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100" />
          </div>
        </div>
        {isEdit && (
          <div className="rounded-lg border border-ink-200 bg-paper-sunken/60 px-3.5 py-3">
            <Switch
              checked={isActive}
              onChange={setIsActive}
              label={isActive ? 'Active' : 'Inactive'}
              description={isActive ? 'This person can sign in.' : 'Signed out and blocked from signing in again until reactivated.'}
            />
          </div>
        )}
        {error && <p className="text-sm text-status-rejected">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Users() {
  const [users, setUsers] = useState(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [modal, setModal] = useState(null);
  const toast = useToast();

  async function load() {
    try {
      setUsers(await adminApi.listUsers());
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = sortRows(
    (users || []).filter((u) => u.fullName.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())),
    filters.sort,
    USER_SORT_FIELDS,
  );

  usePageCount(users === null ? null : filtered.length);

  if (users === null) return <p className="text-sm text-ink-500">Loading…</p>;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="max-w-2xl text-sm text-ink-500">Create, edit, assign roles to, and remove user accounts.</p>
        <Button size="sm" icon={UserPlus} onClick={() => setModal({ type: 'add' })}>
          Add User
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by name or email…" />
        <FilterPanel value={filters} onChange={setFilters} withStatus={false} sortFields={USER_SORT_FIELDS} />
      </div>

      <DataTable
        rowKey={(r) => r.userId}
        rows={filtered}
        columns={[
          {
            key: 'fullName',
            header: 'User',
            render: (r) => (
              <div>
                <p className="font-medium text-ink-900">{r.fullName}</p>
                <p className="text-xs text-ink-500">{r.email}</p>
              </div>
            ),
          },
          { key: 'ssoId', header: 'SSO ID', render: (r) => r.ssoId || <span className="text-ink-400">—</span> },
          { key: 'role', header: 'Role', render: (r) => ROLE_LABELS[r.role] },
          {
            key: 'isActive',
            header: 'Status',
            render: (r) => (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${r.isActive ? 'bg-status-approved-bg text-status-approved' : 'bg-ink-200/60 text-ink-500'}`}>
                {r.isActive ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          { key: 'lastLogin', header: 'Last Login', render: (r) => formatDate(r.lastLogin) },
          { key: 'createdAt', header: 'Created', render: (r) => formatDate(r.createdAt) },
        ]}
        actions={(r) => (
          <>
            <IconButton icon={Pencil} label="Edit" onClick={() => setModal({ type: 'edit', user: r })} />
            <IconButton icon={Trash2} label="Delete" variant="danger" onClick={() => setModal({ type: 'delete', user: r })} />
          </>
        )}
      />

      <UserFormModal open={modal?.type === 'add'} onClose={() => setModal(null)} onSaved={load} editingUser={null} />
      <UserFormModal open={modal?.type === 'edit'} onClose={() => setModal(null)} onSaved={load} editingUser={modal?.user} />

      <ConfirmDialog
        open={modal?.type === 'delete'}
        onClose={() => setModal(null)}
        title="Delete this user?"
        description={`"${modal?.user?.fullName}" will be permanently deleted and removed from this list. This can't be undone - to block sign-in instead while keeping the account around, use Edit and turn off Active.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async () => {
          await adminApi.deleteUser(modal.user.userId);
          toast('User deleted.');
          load();
        }}
      />
    </div>
  );
}
