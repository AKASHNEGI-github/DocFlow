import Icon from './Icon';
import { useEditor } from '../core/EditorContext';

// Covers both toolbar primitive #1 (toggle — highlights when active, e.g.
// Bold) and #2 (instant action — no state, e.g. Undo). The only difference
// is whether `isActive` is provided.
export default function ToolbarButton({ button }) {
  const editor = useEditor();
  const active = button.isActive ? button.isActive(editor) : false;
  const disabled = button.isDisabled ? button.isDisabled(editor) : false;
  // icon/tooltip can be a plain value (most buttons) or a function of the
  // editor (e.g. the theme toggle showing "switch to light/dark" and
  // swapping its own icon depending on which theme is active right now).
  const icon = typeof button.icon === 'function' ? button.icon(editor) : button.icon;
  const tooltip = typeof button.tooltip === 'function' ? button.tooltip(editor) : button.tooltip;

  return (
    <button
      type="button"
      className={`jc-btn${active ? ' jc-btn--active' : ''}`}
      title={tooltip}
      aria-label={tooltip}
      aria-pressed={button.isActive ? active : undefined}
      disabled={disabled}
      // Keep focus (and the live selection) in the editor at all times —
      // the button never needs focus itself.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => button.onClick(editor)}
    >
      <Icon name={icon} />
    </button>
  );
}
