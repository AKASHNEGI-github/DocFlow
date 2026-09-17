import { Navigate, Link } from 'react-router-dom';
import { FileCheck, GitBranch, ShieldCheck, History, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { STAGE_ORDER, stageMeta } from '../lib/status.js';

const FEATURES = [
  {
    icon: GitBranch,
    title: 'A clear pipeline',
    body: 'Every document moves through the same fixed stages, handed off role to role - nothing goes live by accident.',
  },
  {
    icon: ShieldCheck,
    title: 'Real approval, not a rubber stamp',
    body: 'Editors, reviewers, and publishers each do a distinct job. Taking a document live needs sign-off, not just a save button.',
  },
  {
    icon: History,
    title: 'Nothing is ever silently lost',
    body: 'Every version is kept. Every decision - approved, rejected, cancelled - stays on the record, not just the outcome.',
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 text-white">
            <FileCheck size={16} strokeWidth={2.25} />
          </div>
          <span className="font-display text-lg font-semibold text-ink-900">DocFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-ink-700 hover:text-ink-900">
            Sign in
          </Link>
          <Link to="/register" className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700">
            Create account
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-12 text-center">
        <h1 className="font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
          Documents that earn their way to live.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-ink-600">
          DocFlow is a document workflow platform: every document is drafted, edited, reviewed, and published through a
          fixed pipeline - handed off role to role, like a docflow - before it ever reaches your readers.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/register"
            className="flex items-center gap-1.5 rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-700"
          >
            Get started <ArrowRight size={15} />
          </Link>
          <Link to="/login" className="rounded-lg border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-800 hover:bg-paper-sunken">
            Sign in
          </Link>
        </div>

        {/* The pipeline, as the actual point of the product rather than
            decoration - the same five stages every document in the app
            moves through. */}
        <div className="mt-16 flex items-center justify-center overflow-x-auto rounded-2xl border border-ink-200/70 bg-paper-raised px-6 py-8">
          {STAGE_ORDER.map((stage, i) => (
            <div key={stage} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-700">
                  {i + 1}
                </div>
                <span className="whitespace-nowrap text-xs font-medium text-ink-700">{stageMeta(stage).label}</span>
              </div>
              {i < STAGE_ORDER.length - 1 && <div className="mx-2 h-px w-8 bg-ink-200 sm:w-14" />}
            </div>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-1 gap-5 text-left sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-ink-200/70 bg-paper-raised p-5">
              <f.icon size={18} className="text-accent-600" />
              <p className="mt-3 text-sm font-semibold text-ink-900">{f.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">{f.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
