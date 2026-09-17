/**
 * A labeled on/off toggle. First use: the Active/Inactive control on the
 * admin Edit User form (see pages/admin/Users.jsx) - generic enough that
 * anywhere else in the app that needs a plain boolean toggle should
 * reach for this rather than a one-off checkbox.
 */
export default function Switch({ checked, onChange, label, description, disabled = false }) {
  return (
    <label className={`flex items-start justify-between gap-4 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-ink-800">{label}</span>}
          {description && <span className="mt-0.5 block text-xs text-ink-500">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 ${
          checked ? 'bg-accent-600' : 'bg-ink-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}
