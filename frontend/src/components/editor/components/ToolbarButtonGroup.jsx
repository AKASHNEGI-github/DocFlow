import Icon from './Icon';
import { useEditor } from '../core/EditorContext';

// Toolbar primitive #4 — a row of mutually-exclusive options (Align: left /
// center / right / justify). Only one option shows active at a time.
export default function ToolbarButtonGroup({ button }) {
  const editor = useEditor();

  return (
    <div className="jc-btn-group" role="group" aria-label={button.tooltip}>
      {button.options.map((opt) => {
        const active = button.isActive(editor, opt.value);
        const disabled = button.isDisabled ? button.isDisabled(editor) : false;
        return (
          <button
            key={opt.value}
            type="button"
            className={`jc-btn${active ? ' jc-btn--active' : ''}`}
            title={opt.label || button.tooltip}
            aria-label={opt.label || button.tooltip}
            aria-pressed={active}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => button.onClick(editor, opt.value)}
          >
            <Icon name={opt.icon} />
          </button>
        );
      })}
    </div>
  );
}
