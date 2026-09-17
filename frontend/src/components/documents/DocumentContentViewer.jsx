import { Editor, allPlugins } from '../editor/index.js';
import '../editor/styles/editor.css';
import { useTheme } from '../../context/ThemeContext.jsx';

/**
 * Used by DocumentReader.jsx (the full-page `/read/:id` view) and
 * DocumentDetailModal.jsx ("Actions -> View") wherever a document's full,
 * saved content needs to be shown - not Home.jsx's clamped 2-line card
 * preview, which stays plain HTML (see styles/global.css's .docflow-content)
 * since mounting a full editor instance per card in a grid would be
 * wasteful, and a 2-line clamp has no room for interactive code tabs
 * anyway.
 *
 * `id` should be the document's own id when the caller has one (cheap,
 * stable) - it's only used as a React key, to force a clean remount
 * when the document being shown changes. That's needed because
 * EditorContext loads initialValue exactly once, on mount, by design:
 * for live editing, content should never be clobbered out from under
 * someone mid-edit by a prop update. A read-only viewer has no such
 * edit-in-progress to protect, so a fresh instance per document is both
 * simplest and correct. Falls back to keying on the content string
 * itself if no id is given.
 */
export default function DocumentContentViewer({ content, id }) {
  const { theme } = useTheme();
  return <Editor key={id ?? content} plugins={allPlugins} toolbarRows={[]} initialValue={content || ''} readOnly syncTheme={theme} />;
}
