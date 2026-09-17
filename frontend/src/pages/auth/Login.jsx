import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FileCheck, Eye, EyeOff, GitBranch, ShieldCheck, History } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import Footer from '../../components/layout/Footer.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || '/home', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-500">Sign in to continue to DocFlow.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="Email address" type="email" value={email} onChange={setEmail} autoFocus />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          labelExtra={
            <Link to="/forgot-password" className="text-xs font-medium text-accent-600 hover:underline">
              Forgot password?
            </Link>
          }
        />

        {error && <p className="text-sm text-status-rejected">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-700 disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        New to DocFlow?{' '}
        <Link to="/register" className="font-medium text-accent-600 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

const FEATURES = [
  { icon: GitBranch, title: 'Structured approval workflow', description: 'Draft, Editorial, Review, Publication, Live - every document moves through the same clear stages.' },
  { icon: ShieldCheck, title: 'Role-based control', description: 'Authors, editors, reviewers, publishers, and admins each see exactly what their role needs.' },
  { icon: History, title: 'Full audit trail', description: 'Every promotion, approval, and rejection is recorded against the document that earned it.' },
];

/**
 * Split screen: a fixed brand/feature panel (hidden below lg - a
 * two-column layout has no good narrow-viewport version, so mobile just
 * gets the form with its own compact logo header instead) plus the
 * actual form card, unchanged in substance from the original centered
 * layout. Shared by every auth page (Login, Register, ForgotPassword,
 * ResetPassword) via the same `children` prop those pages already pass,
 * so none of them needed to change to pick this up.
 */
export function AuthShell({ children }) {
  return (
    <div className="flex min-h-screen bg-paper">
      <div className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden bg-nav-bg px-10 py-10 text-nav-text-emphasis lg:flex xl:px-14">
        {/* Purely decorative glow, echoing the reference layout's use of
            large soft circles to keep a flat panel from feeling static -
            clipped by the panel's own overflow-hidden. */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-accent-500/10 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 text-white">
            <FileCheck size={18} strokeWidth={2.25} />
          </div>
          <span className="font-display text-lg font-semibold">DocFlow</span>
        </div>

        <div className="relative">
          <h2 className="font-display text-3xl font-semibold leading-tight xl:text-4xl">Every document, live from every author.</h2>
          <p className="mt-3 max-w-sm text-sm text-nav-text">A calmer path from first draft to published, with sign-off built in at every stage.</p>

          <ul className="mt-9 space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-100 text-accent-700">
                  <f.icon size={17} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-nav-text-emphasis">{f.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-nav-text">{f.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-nav-text-muted">© {new Date().getFullYear()} DocFlow. All rights reserved.</p>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-600 text-white">
                <FileCheck size={20} strokeWidth={2.25} />
              </div>
              <span className="font-display text-xl font-semibold text-ink-900">DocFlow</span>
            </div>
            <div className="rounded-2xl border border-ink-200/70 bg-paper-raised p-8 shadow-sm">{children}</div>
          </div>
        </div>
        <Footer edgeToEdge={false} />
      </div>
    </div>
  );
}

/**
 * Shared by every auth page (Login, Register, ForgotPassword,
 * ResetPassword). type="password" fields automatically get a show/hide
 * toggle - built once here so it applies everywhere a password is
 * typed, not just Login. `labelExtra` is an optional slot next to the
 * label itself (Login's "Forgot password?" link).
 */
export function Field({ label, type = 'text', value, onChange, autoFocus, hint, labelExtra }) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (reveal ? 'text' : 'password') : type;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-ink-800">{label}</label>
        {labelExtra}
      </div>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoFocus={autoFocus}
          className={`w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100 ${isPassword ? 'pr-10' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            tabIndex={-1}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
          >
            {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}
