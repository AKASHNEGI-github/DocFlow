export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 border-b border-ink-200/70">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            active === tab.value ? 'text-ink-900' : 'text-ink-400 hover:text-ink-600'
          }`}
        >
          {tab.label}
          {typeof tab.count === 'number' && (
            <span className={`ml-1.5 text-xs ${active === tab.value ? 'text-accent-600' : 'text-ink-400'}`}>{tab.count}</span>
          )}
          {active === tab.value && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent-600" />}
        </button>
      ))}
    </div>
  );
}
