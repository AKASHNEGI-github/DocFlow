import { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import { useEditor } from '../core/EditorContext';
import { PALETTE } from '../core/palette';
import { useMenuKeyboardNav } from '../core/useMenuKeyboardNav';

// One button covers both text and background color — a tabbed popup
// picks which, matching how Jodit's own "brush" button works (one
// button, Text/Background tabs inside), rather than two separate buttons
// that do visibly the same kind of thing.
export default function ColorPicker({ button }) {
  const editor = useEditor();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('text'); // 'text' | 'background'
  const rootRef = useRef(null);
  const disabled = button?.isDisabled ? button.isDisabled(editor) : false;

  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  useMenuKeyboardNav(rootRef, open, setOpen);

  const command = tab === 'text' ? 'foreColor' : 'hiliteColor';
  const apply = (color) => {
    editor.exec(command, color);
    setOpen(false);
  };

  return (
    <div className="jc-dropdown" ref={rootRef}>
      <button
        type="button"
        className="jc-btn"
        title="Text & background color"
        aria-label="Text & background color"
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="color" />
      </button>
      {open && (
        <div className="jc-color-popup">
          <div className="jc-color-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'text'}
              className={`jc-color-tab${tab === 'text' ? ' jc-color-tab--active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setTab('text')}
            >
              Text
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'background'}
              className={`jc-color-tab${tab === 'background' ? ' jc-color-tab--active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setTab('background')}
            >
              Background
            </button>
          </div>
          <div className="jc-color-grid" role="listbox" aria-label={`${tab} color`}>
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
            <label htmlFor="jc-color-custom-input">Custom</label>
            <input
              id="jc-color-custom-input"
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
