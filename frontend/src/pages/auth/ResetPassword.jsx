import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/auth.api.js';
import { AuthShell, Field } from './Login.jsx';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      navigate('/login', { replace: true, state: { resetSuccess: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthShell>
        <p className="text-center text-sm text-ink-500">
          This reset link is missing its token.{' '}
          <Link to="/forgot-password" className="font-medium text-accent-600 hover:underline">
            Request a new one
          </Link>
          .
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Set a new password</h1>
      <p className="mt-1 text-sm text-ink-500">Signing everyone else out of this account once it's saved.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="New password" type="password" value={password} onChange={setPassword} hint="At least 8 characters." autoFocus />
        <Field label="Confirm new password" type="password" value={confirm} onChange={setConfirm} />
        {error && <p className="text-sm text-status-rejected">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-700 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </AuthShell>
  );
}
