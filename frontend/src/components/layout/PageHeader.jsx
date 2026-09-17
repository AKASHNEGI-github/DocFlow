export default function PageHeader({ description, action }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      {description && <p className="max-w-2xl text-sm text-ink-500">{description}</p>}
      {action}
    </div>
  );
}
