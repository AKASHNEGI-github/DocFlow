/**
 * Applies a FilterPanel value to one row. `statusField` lets each page
 * point at whichever of its own fields actually holds that data
 * (requestStatus vs status) without repeating this check on every page.
 */
export function matchesFilters(row, filters, { statusField = 'requestStatus' } = {}) {
  if (filters.status && filters.status !== 'ALL' && row[statusField] !== filters.status) {
    return false;
  }
  return true;
}
