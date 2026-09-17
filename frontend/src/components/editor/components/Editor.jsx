import { memo } from 'react';
import { EditorProvider, useEditor } from '../core/EditorContext';
import Toolbar from './Toolbar';
import TableTools from './TableTools';
import MediaTools from './MediaTools';
import LinkTools from './LinkTools';
import EditorCore from './EditorCore';
import SourceView from './SourceView';
import StatusBar from './StatusBar';
import Modal from './Modal';
import '../styles/editor.css';

function EditorShell({ toolbarRows }) {
  const editor = useEditor();

  if (editor.readOnly) {
    // No Toolbar means no button ever puts this into 'source' mode or
    // opens a popup, so none of that chrome (or the state that drives
    // it) is reachable here - just the content itself, styled exactly
    // like the live editor because it IS the live editor, minus the
    // parts that only make sense while composing. TableTools/MediaTools/
    // LinkTools already no-op under editor.locked (see each file), but
    // not rendering them here at all avoids even mounting their
    // selection-tracking for a surface that's never supposed to show them.
    return (
      <div ref={editor.rootRef} data-theme={editor.theme} className="jc-root jc-root--readonly">
        <div className="jc-body">
          <EditorCore />
        </div>
      </div>
    );
  }

  return (
    <div ref={editor.rootRef} data-theme={editor.theme} className={`jc-root${editor.fullscreen ? ' jc-root--fullscreen' : ''}`}>
      <Toolbar rows={toolbarRows} />
      <div className="jc-body">
        {editor.mode === 'source' ? <SourceView /> : <EditorCore />}
        <TableTools />
        <MediaTools />
        <LinkTools />
      </div>
      <StatusBar />
      <Modal />
    </div>
  );
}

// Wrapped in memo() because of how `onChange` typically gets used: a host
// app almost always stores the latest HTML in its own state (to enable a
// Save button, show a live preview, etc.), and onChange fires on every
// single keystroke (see handleInput in EditorContext.jsx) — so the host's
// own component re-renders on every keystroke too, as a direct
// consequence of just wiring onChange up at all, not because it did
// anything wrong. Without memo, that re-render cascades into this
// component and everything below it (Toolbar and every one of its
// buttons, TableTools, MediaTools, LinkTools, StatusBar) on every single
// keystroke, for no reason: none of that subtree's own output depends on
// the host re-rendering, only on state living inside EditorProvider
// itself, which continues to trigger its own re-renders exactly as
// before regardless of this memo (memo only short-circuits a re-render
// forced from the *parent*; it has no effect on state changes originating
// inside this subtree). This only pays off if `plugins`/`toolbarRows`/
// `initialValue`/`onChange` are stable references from the host — see
// DocumentEditorField.jsx/DocumentContentViewer.jsx, the only two places
// in this app that render this component, for how that's kept true here.
const Editor = memo(function Editor({ plugins, toolbarRows, initialValue, onChange, readOnly, syncTheme }) {
  return (
    <EditorProvider plugins={plugins} initialValue={initialValue} onChange={onChange} readOnly={readOnly} syncTheme={syncTheme}>
      <EditorShell toolbarRows={toolbarRows} />
    </EditorProvider>
  );
});

export default Editor;
