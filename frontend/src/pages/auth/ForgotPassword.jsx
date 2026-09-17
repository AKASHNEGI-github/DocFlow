import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { authApi } from '../../api/auth.api.js';
import { AuthShell, Field } from './Login.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-100 text-accent-700">
            <MailCheck size={20} />
          </div>
          <h1 className="font-display text-xl font-semibold text-ink-900">Check your email</h1>
          <p className="text-sm text-ink-500">If an account exists for {email}, a reset link is on its way.</p>
          <Link to="/login" className="mt-2 text-sm font-medium text-accent-600 hover:underline">
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Reset your password</h1>
      <p className="mt-1 text-sm text-ink-500">We'll email you a link to set a new one.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="Email address" type="email" value={email} onChange={setEmail} autoFocus />
        {error && <p className="text-sm text-status-rejected">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-700 disabled:opacity-60"
        >
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        <Link to="/login" className="font-medium text-accent-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
