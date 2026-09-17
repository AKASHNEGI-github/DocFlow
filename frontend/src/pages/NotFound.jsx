import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper text-center">
      <p className="font-display text-4xl font-semibold text-ink-900">404</p>
      <p className="text-sm text-ink-500">That page doesn't exist.</p>
      <Link to="/home" className="text-sm font-medium text-accent-600 hover:underline">
        Back to Home
      </Link>
    </div>
  );
}
