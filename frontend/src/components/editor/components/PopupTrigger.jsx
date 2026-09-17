import Icon from './Icon';
import { useEditor } from '../core/EditorContext';

// Toolbar primitive #6/#7 trigger — insert link/image/file/video/table,
// special characters, find & replace all open through this same button;
// the plugin supplies what's actually inside via button.renderPopup.
export default function PopupTrigger({ button }) {
  const editor = useEditor();
  const active = editor.activePopup?.name === button.name;
  const disabled = button.isDisabled ? button.isDisabled(editor) : false;

  return (
    <button
      type="button"
      className={`jc-btn${active ? ' jc-btn--active' : ''}`}
      title={button.tooltip}
      aria-label={button.tooltip}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        editor.selection.save();
        editor.openPopup(button.name, button.renderPopup, button.large, button.persistent);
      }}
    >
      <Icon name={button.icon} />
    </button>
  );
}
