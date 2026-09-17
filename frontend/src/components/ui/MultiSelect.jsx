import { useState } from 'react';
import { Check, Search } from 'lucide-react';

/**
 * A searchable checkbox (or radio, when multiple=false) list - used for
 * every approver picker in the app (editors/reviewers/publishers on a
 * Promote modal, and the exactly-one-of-each pickers on the Deletion
 * request modal). Deliberately a plain scrollable list rather than a
 * combobox/typeahead - the lists this ever renders (editors, reviewers,
 * publishers) are small, and a visible list is easier to scan than a
 * dropdown when picking more than one person.
 */
export default function MultiSelect({ options, selected, onChange, multiple = true, placeholder = 'Search people…' }) {
  const [query, setQuery] = useState('');
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  function toggle(value) {
    if (multiple) {
      onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    } else {
      onChange([value]);
    }
  }

  return (
    <div className="rounded-lg border border-ink-200">
      <div className="relative border-b border-ink-200 p-2">
        <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md py-1.5 pl-6 pr-2 text-sm focus:outline-none"
        />
      </div>
      <div className="thin-scroll max-h-48 overflow-y-auto p-1.5">
        {filtered.length === 0 && <p className="px-3 py-4 text-center text-sm text-ink-400">No matches.</p>}
        {filtered.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              type="button"
              key={option.value}
              onClick={() => toggle(option.value)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                isSelected ? 'bg-accent-100 text-accent-700' : 'text-ink-700 hover:bg-paper-sunken'
              }`}
            >
              <span>{option.label}</span>
              {isSelected && <Check size={15} strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
