import { useEffect, useRef, useState } from 'react';
import { Filter, Check } from 'lucide-react';
import { availableSortOptions } from '../../lib/sort.js';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const DEFAULT_SORT_FIELDS = { name: 'title', created: 'createdAt', updated: 'updatedAt' };

export const DEFAULT_FILTERS = { status: 'ALL', sort: 'createdNewest' };

function countActive(value) {
  let n = 0;
  if (value.status && value.status !== 'ALL') n += 1;
  return n;
}

/**
 * One consistent Filter control for every list page in the app, rather
 * than the inconsistent per-page StatusFilter dropdown some pages had
 * and others didn't. `withStatus=false` hides the status row entirely
 * for pages with no status concept (Draft, Live, Users).
 *
 * The sort list replaces what used to be a "Published Range" date
 * picker here: two bare <input type="date"> fields have an unavoidably
 * wide natural minimum size (worse once a locale's date format is
 * longer than dd-mm-yyyy), which is exactly what was overflowing this
 * panel's border in the first place. A sort-order list needs no input
 * widths to negotiate at all, fixes that overflow by construction, and
 * - per direct request - is the same generic control every list page
 * needs anyway, documents and users alike.
 *
 * `sortFields` says which of the six options actually apply to this
 * page's data (see lib/sort.js) - defaults to the shape most
 * document-listing pages share (title/createdAt/updatedAt); pages with
 * different field names or missing data (Users has no updatedAt at
 * all; Live/Home's data only tracks publishedAt) pass their own.
 */
export default function FilterPanel({ value, onChange, withStatus = true, sortFields = DEFAULT_SORT_FIELDS }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const activeCount = countActive(value);
  const sortOptions = availableSortOptions(sortFields);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function patch(partial) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          activeCount > 0 ? 'border-accent-600 bg-accent-100 text-accent-700' : 'border-ink-200 bg-paper-raised text-ink-700 hover:bg-paper-sunken'
        }`}
      >
        <Filter size={15} />
        Filter
        {activeCount > 0 && <span className="rounded-full bg-accent-600 px-1.5 text-xs text-white">{activeCount}</span>}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-ink-200/70 bg-paper-raised py-2 shadow-lg">
          {withStatus && (
            <div className="mb-2 border-b border-ink-100 px-3.5 pb-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Status</p>
              <select
                value={value.status}
                onChange={(e) => patch({ status: e.target.value })}
                className="w-full rounded-lg border border-ink-200 bg-paper-raised px-2.5 py-1.5 text-sm text-ink-800 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <p className="mb-1 px-3.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Sort by</p>
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                patch({ sort: opt.key });
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-sm transition-colors hover:bg-paper-sunken ${
                value.sort === opt.key ? 'font-medium text-accent-700' : 'text-ink-700'
              }`}
            >
              {opt.label}
              {value.sort === opt.key && <Check size={15} />}
            </button>
          ))}

          {activeCount > 0 && (
            <div className="mt-1 border-t border-ink-100 px-3.5 pt-2">
              <button onClick={() => onChange(DEFAULT_FILTERS)} className="text-xs font-medium text-accent-600 hover:underline">
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
