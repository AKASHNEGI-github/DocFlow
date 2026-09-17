import { Editor, allPlugins, toolbarRows } from '../editor/index.js';
import '../editor/styles/editor.css';

/**
 * Thin wrapper around the provided Editor component for use as a form
 * field: the editor already deals natively in HTML strings (initialValue
 * in, onChange gives sanitized HTML back out - see
 * components/editor/core/EditorContext.jsx), which is exactly the
 * "convert content to HTML and save it in the database" contract this
 * app needs, so there's no serialization step to write here at all.
 */
export default function DocumentEditorField({ value, onChange, label }) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-ink-800">{label}</label>}
      <div className="overflow-hidden rounded-lg border border-ink-200">
        <Editor plugins={allPlugins} toolbarRows={toolbarRows} initialValue={value || ''} onChange={onChange} />
      </div>
    </div>
  );
}
