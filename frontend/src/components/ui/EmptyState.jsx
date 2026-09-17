export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink-200 bg-paper-raised/60 px-6 py-16 text-center">
      {Icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-paper-sunken text-ink-400">
          <Icon size={20} strokeWidth={1.75} />
        </div>
      )}
      <div>
        <p className="font-medium text-ink-800">{title}</p>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
