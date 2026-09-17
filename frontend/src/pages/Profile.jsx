import { useState } from 'react';
import { usersApi } from '../api/users.api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ROLE_LABELS } from '../lib/roles.js';
import Button from '../components/ui/Button.jsx';

export default function Profile() {
  const { user } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingInfo, setSavingInfo] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  async function handleSaveInfo(e) {
    e.preventDefault();
    setSavingInfo(true);
    try {
      await usersApi.updateMe({ fullName, email });
      toast('Profile updated.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingInfo(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError('');
    setSavingPassword(true);
    try {
      await usersApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      toast('Password changed.');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-xl border border-ink-200/70 bg-paper-raised p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900">Basic info</h2>
        <p className="mt-1 text-sm text-ink-500">
          Role: <span className="font-medium text-ink-700">{ROLE_LABELS[user?.role]}</span> (only an admin can change this)
        </p>
        <form onSubmit={handleSaveInfo} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-800">Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-800">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100" />
          </div>
          <Button type="submit" size="sm" disabled={savingInfo}>
            {savingInfo ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-ink-200/70 bg-paper-raised p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900">Change password</h2>
        <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-800">Current password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-800">New password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100" />
          </div>
          {passwordError && <p className="text-sm text-status-rejected">{passwordError}</p>}
          <Button type="submit" size="sm" disabled={savingPassword}>
            {savingPassword ? 'Saving…' : 'Change password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
