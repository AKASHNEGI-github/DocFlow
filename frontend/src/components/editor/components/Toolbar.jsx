import ToolbarButton from './ToolbarButton';
import ToolbarButtonGroup from './ToolbarButtonGroup';
import ToolbarDropdown from './ToolbarDropdown';
import ColorPicker from './ColorPicker';
import PopupTrigger from './PopupTrigger';

export const SEPARATOR = { separator: true };

const RENDERERS = {
  toggle: ToolbarButton,
  instant: ToolbarButton,
  buttonGroup: ToolbarButtonGroup,
  dropdown: ToolbarDropdown,
  colorpicker: ColorPicker,
  popup: PopupTrigger,
};

// "Lock" used to only disable contentEditable — every toolbar button
// still ran its command and mutated the DOM regardless (see
// CommandRegistry.exec for the other half of this fix). Rather than
// threading an `editor.locked` check into every individual plugin file,
// this is the one place all of them render through, so it's also the one
// place to fold `editor.locked` into every button's isDisabled — content-
// mutating buttons end up disabled while locked without each plugin
// needing to know about lock at all. A small allowlist stays enabled:
// these either don't change content (copy, selectAll) or are genuinely
// view-only actions a read-only document should still support (theme,
// full screen, print, preview, about, and unlocking itself — sourceMode
// too, since its own textarea is separately made read-only while locked
// rather than hidden, so you can still look at the HTML).
const SAFE_WHEN_LOCKED = new Set([
  'lock', 'theme', 'fullscreen', 'sourceMode', 'copy', 'selectAll', 'preview', 'print', 'about',
]);

function renderRow(row, rowIndex) {
  return (
    <div className="jc-toolbar-row" key={rowIndex}>
      {row.map((plugin, i) => {
        if (plugin === SEPARATOR) return <span key={`sep-${rowIndex}-${i}`} className="jc-toolbar-sep" />;
        const button = plugin.button;
        if (!button) return null;
        const Renderer = RENDERERS[button.type];
        if (!Renderer) return null;
        const name = button.name || plugin.name;
        const originalIsDisabled = button.isDisabled;
        const lockAwareButton = SAFE_WHEN_LOCKED.has(name)
          ? button
          : {
              ...button,
              isDisabled: (editor) => editor.locked || (originalIsDisabled ? originalIsDisabled(editor) : false),
            };
        return <Renderer key={name} button={{ ...lockAwareButton, name }} />;
      })}
    </div>
  );
}

// `rows` is a fixed 2D layout — e.g. [[bold, italic, ...], [insertLink, ...]]
// — rendered as two rows that never reflow into each other. That's
// deliberate: with flex-wrap, which buttons land on which row depends on
// how much width is available, so entering/leaving full screen (a big
// width change) reshuffles every button's position. Fixing the row
// assignment up front means a button is always in the same place,
// regardless of viewport width; a row that's too narrow scrolls
// horizontally instead of wrapping.
export default function Toolbar({ rows }) {
  return (
    <div className="jc-toolbar" role="toolbar" aria-label="Formatting">
      {rows.map((row, i) => renderRow(row, i))}
    </div>
  );
}
