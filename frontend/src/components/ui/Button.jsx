const VARIANTS = {
  primary: 'bg-accent-600 text-white hover:bg-accent-700 disabled:bg-ink-200 disabled:text-ink-400',
  secondary: 'bg-paper-raised text-ink-900 border border-ink-200 hover:bg-paper-sunken disabled:text-ink-400',
  danger: 'bg-paper-raised text-status-rejected border border-status-rejected/30 hover:bg-status-rejected-bg disabled:text-ink-400 disabled:border-ink-200',
  ghost: 'text-ink-600 hover:bg-paper-sunken disabled:text-ink-400',
};

const SIZES = {
  sm: 'text-xs px-2.5 py-1.5 gap-1.5',
  md: 'text-sm px-3.5 py-2 gap-2',
};

export default function Button({ variant = 'primary', size = 'md', className = '', icon: Icon, children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2.25} />}
      {children}
    </button>
  );
}
