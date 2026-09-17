import { useState, useRef, useEffect } from 'react';
import { useEditor } from '../core/EditorContext';
import Icon from './Icon';
import { useMenuKeyboardNav } from '../core/useMenuKeyboardNav';

// Toolbar primitive #3 — font family, font size, format block, line height
// all reduce to this same shape: a trigger showing the current value, and
// a list of options below it.
export default function ToolbarDropdown({ button }) {
  const editor = useEditor();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = button.getValue ? button.getValue(editor) : '';
  const currentOption = button.options.find((o) => o.value === current);
  const disabled = button.isDisabled ? button.isDisabled(editor) : false;

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  useMenuKeyboardNav(rootRef, open, setOpen);

  return (
    <div className="jc-dropdown" ref={rootRef}>
      <button
        type="button"
        className="jc-dropdown-trigger"
        title={button.tooltip}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="jc-dropdown-label">
          {currentOption ? currentOption.label : <Icon name={button.icon} />}
        </span>
        <svg className="jc-caret" viewBox="0 0 10 6" width="10" height="6">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <ul className="jc-dropdown-menu" role="listbox">
          {button.options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                className={`jc-dropdown-item${opt.value === current ? ' jc-dropdown-item--active' : ''}`}
                style={opt.previewStyle}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  button.onSelect(editor, opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
