import { Search } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Search by title, category, or status…' }) {
  return (
    <div className="relative flex-1 min-w-[240px]">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-ink-200 bg-paper-raised py-2 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100"
      />
    </div>
  );
}
