/**
 * The Editor component, its full plugin set, and the two-row toolbar
 * layout - an updated drop-in replacement for the previously-integrated
 * editor, with another round of fixes folded in (table/media/link
 * toolbar positioning near the top of the document, independent-axis
 * media resize, a stale-closure bug that let code-tab edit/delete bypass
 * Lock, code-block dialogs no longer discarding work on a stray outside
 * click, and a memo() fix for typing feeling heavier over a long
 * session) - see the project's changelog notes for the full list. This
 * barrel file, like in the previous version, didn't exist in the
 * originally-supplied standalone project - see
 * components/documents/DocumentEditorField.jsx for how the rest of this
 * app plugs into it, and its own styles/editor.css for the `.jc-content`
 * typography rules `docflow-content`/`prose-reader` (styles/global.css)
 * are meant to visually mirror for read-only rendering.
 */
export { default as Editor } from './components/Editor.jsx';
export { allPlugins, toolbarRows } from './plugins/index.js';
