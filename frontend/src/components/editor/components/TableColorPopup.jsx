import { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import { PALETTE } from '../core/palette';
import { setCellStyle } from '../core/tableUtils';
import { useMenuKeyboardNav } from '../core/useMenuKeyboardNav';

const TABS = [
  { key: 'background', label: 'Background', prop: 'backgroundColor' },
  { key: 'text', label: 'Text', prop: 'color' },
  { key: 'border', label: 'Border', prop: 'borderColor' },
];

export default function TableColorPopup({ cell, onApply }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('background');
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  useMenuKeyboardNav(rootRef, open, setOpen);

  const activeProp = TABS.find((t) => t.key === tab).prop;

  const apply = (color) => {
    setCellStyle(cell, activeProp, color);
    onApply();
    setOpen(false);
  };

  return (
    <div className="jc-dropdown" ref={rootRef}>
      <button
        type="button"
        className="jc-btn"
        title="Cell colors"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="color" />
      </button>
      {open && (
        <div className="jc-color-popup">
          <div className="jc-color-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`jc-color-tab${tab === t.key ? ' jc-color-tab--active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="jc-color-grid" role="listbox" aria-label={`Cell ${tab} color`}>
            {PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                className="jc-color-swatch"
                style={{ background: color }}
                title={color}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(color)}
              />
            ))}
          </div>
          <div className="jc-color-custom">
            <label htmlFor="jc-cell-color-custom">Custom</label>
            <input
              id="jc-cell-color-custom"
              type="color"
              onMouseDown={(e) => e.preventDefault()}
              onChange={(e) => apply(e.target.value)}
            />
            <button type="button" className="jc-color-clear" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('')}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
