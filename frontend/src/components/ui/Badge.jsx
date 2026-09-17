import { statusMeta, stageMeta } from '../../lib/status.js';

const STATUS_CLASSES = {
  none: 'bg-ink-200/60 text-ink-600',
  pending: 'bg-status-pending-bg text-status-pending',
  approved: 'bg-status-approved-bg text-status-approved',
  rejected: 'bg-status-rejected-bg text-status-rejected',
  cancelled: 'bg-status-cancelled-bg text-status-cancelled',
};

export function StatusBadge({ status }) {
  const meta = statusMeta(status);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[meta.colorKey]}`}>
      {meta.label}
    </span>
  );
}

export function StageBadge({ stage }) {
  const meta = stageMeta(stage);
  const isLive = stage === 'LIVE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isLive ? 'bg-status-live-bg text-status-live' : 'bg-ink-100 text-ink-600 bg-ink-200/50'
      }`}
    >
      {isLive && <span className="h-1.5 w-1.5 rounded-full bg-status-live" />}
      {meta.label}
    </span>
  );
}
