import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const VARIANTS = {
  default: 'text-ink-500 hover:bg-paper-sunken hover:text-ink-800',
  danger: 'text-ink-500 hover:bg-status-rejected-bg hover:text-status-rejected',
  accent: 'text-ink-500 hover:bg-accent-100 hover:text-accent-700',
};

export default function IconButton({ icon: Icon, label, variant = 'default', ...props }) {
  const btnRef = useRef(null);
  const timerRef = useRef(null);
  const [pos, setPos] = useState(null); // null = hidden; {top, left} = shown, in viewport coordinates

  function scheduleShow() {
    clearTimeout(timerRef.current);
    // A short delay (matching typical native-tooltip conventions) so
    // moving the mouse across a row of several icons doesn't flash a
    // tooltip for each one it passes over.
    timerRef.current = setTimeout(() => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.top - 6, left: r.left + r.width / 2 });
    }, 250);
  }

  function hide() {
    clearTimeout(timerRef.current);
    setPos(null);
  }

  return (
    <>
      <button
        ref={btnRef}
        aria-label={label}
        onMouseEnter={scheduleShow}
        onMouseLeave={hide}
        onFocus={scheduleShow}
        onBlur={hide}
        className={`rounded-md p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-30 ${VARIANTS[variant]}`}
        {...props}
      >
        <Icon size={16} strokeWidth={2} />
      </button>
      {label &&
        pos &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-ink-200 bg-paper-raised px-2 py-1 text-xs font-medium text-ink-900 shadow-lg"
            style={{ top: pos.top, left: pos.left }}
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  );
}
