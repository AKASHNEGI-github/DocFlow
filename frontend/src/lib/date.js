/**
 * formatDate now includes time - every timestamp in this app (created,
 * requested, published, last login) is an event that happened at a
 * specific moment, not just on a day, so there was never really a case
 * where date-only was the more correct choice. Redefining it here once,
 * rather than hunting down every formatDate( call across every page,
 * so the fix reaches everywhere at once.
 */
export function formatDate(value) {
  return formatDateTime(value);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  // hour12 must be explicit. Without it, toLocaleString falls back to
  // whatever the runtime's default locale/environment prefers - often
  // 12-hour with AM/PM on en-US, but 24-hour (no AM/PM at all) on many
  // other locales and server/CI environments. That inconsistency, not
  // anything wrong with the underlying Date, was why AM/PM sometimes
  // silently disappeared across the app.
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
