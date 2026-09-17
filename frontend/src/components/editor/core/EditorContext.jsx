import { createContext, useContext, useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { SelectionManager } from './SelectionManager';
import { CommandRegistry } from './CommandRegistry';
import { HistoryManager } from './HistoryManager';
import { getInitialTheme, persistTheme } from './themeStorage';
import { applyHljsTheme } from './hljsTheme';
import { sanitizeHtml } from './sanitize';

const EditorContext = createContext(null);

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor() must be used inside <EditorProvider>');
  return ctx;
}

export function EditorProvider({ plugins, initialValue, onChange, readOnly = false, syncTheme, children }) {
  const containerRef = useRef(null);
  // Points at the outer .jc-root shell, which is mounted once and lives
  // for the whole life of the editor. containerRef, by contrast, gets
  // reassigned to a brand-new DOM node every time EditorCore
  // unmounts/remounts (which happens on every switch into "view HTML
  // source" and back — see EditorShell). Plugins that attach a DOM
  // listener once in init() and expect it to keep working forever (e.g.
  // codeBlock's click delegation) need to bind to something that never
  // gets swapped out from under them — this ref is that anchor.
  const rootRef = useRef(null);
  const selectionRef = useRef(null);
  const commandsRef = useRef(null);
  const historyRef = useRef(null);
  const apiRef = useRef(null); // always holds the *current* render's api — closures below read this, not a stale one
  const sourceContentRef = useRef(''); // HTML captured the instant source mode is entered — see changeMode below

  const [mode, setMode] = useState('wysiwyg'); // 'wysiwyg' | 'source'
  const [fullscreen, setFullscreen] = useState(false);
  // readOnly starts pre-locked - a viewer embedding this (see
  // components/documents/DocumentContentViewer.jsx) has no lock button
  // for the person to click, so it needs to already be true on the very
  // first render rather than requiring a toggle that doesn't exist here.
  const [locked, setLocked] = useState(() => Boolean(readOnly));
  // A plain captured `editor.locked` boolean is fine for anything read
  // through useEditor() during a normal render (Context correctly
  // re-renders consumers with the current value) - but codeBlock.jsx's
  // init() hook captures its whole `editor` argument exactly ONCE, in a
  // click listener meant to keep working for the editor's entire
  // lifetime (see the comment on that plugin's init() for why it has to
  // be set up that way). Every render below builds a brand new `api`
  // object, so a plain `locked` property baked into that first, one-time
  // snapshot stays permanently frozen at whatever it was at mount (i.e.
  // false) - toggling Lock later never changes what that specific
  // captured object holds, and the code-block widget's own locked check
  // would silently pass an unlocked check forever, letting edit/delete-
  // tab/add-tab keep working right through Lock being turned on. This
  // ref is mutated in place instead of replaced, so isLocked() below
  // keeps reading the *current* value no matter how old the particular
  // closure calling it is.
  const lockedRef = useRef(locked);
  // syncTheme, when passed, means "a host component is driving this
  // editor's theme, not the person using it" - DocumentContentViewer
  // passes the app's own light/dark theme here so a read-only document
  // matches the rest of the page instead of following this editor's own
  // independent (and, outside of actually composing a document,
  // meaningless) theme preference in localStorage.
  const [theme, setThemeState] = useState(() => syncTheme || getInitialTheme());

  useEffect(() => {
    if (syncTheme) setThemeState(syncTheme);
  }, [syncTheme]);
  const [activePopup, setActivePopup] = useState(null); // { name, render } | null
  const [, forceRender] = useState(0);
  const bump = useCallback(() => forceRender((v) => v + 1), []);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      persistTheme(next);
      return next;
    });
  }, []);

  // Runs before the browser paints (not after, like a plain useEffect)
  // so the very first frame — and every theme switch after it — never
  // shows code blocks flash with the wrong (or no) syntax colors while
  // catching up. highlight.js's theme is a separate stylesheet full of
  // its own literal colors, so it can't just read the --jc-* variables
  // the rest of the editor uses; this is what keeps it in sync with them.
  useLayoutEffect(() => {
    applyHljsTheme(theme);
  }, [theme]);

  if (!selectionRef.current) selectionRef.current = new SelectionManager(containerRef);
  if (!commandsRef.current) commandsRef.current = new CommandRegistry();

  const getHTML = useCallback(() => containerRef.current?.innerHTML ?? '', []);
  const setHTMLInternal = useCallback(
    (html) => {
      if (containerRef.current) {
        // Sanitized here rather than on the way out: this is the one
        // choke point that every source of "content from outside this
        // editor's own live DOM" already passes through — undo/redo
        // replay, committing out of source-view, and (via editor.setHTML)
        // whatever the host app loads in from its database — so it's
        // where a script tag or an on-click handler that got saved by
        // some other path gets stopped before it can run again.
        const clean = sanitizeHtml(html);
        containerRef.current.innerHTML = clean;
        onChange?.(clean);
      }
    },
    [onChange]
  );

  if (!historyRef.current) {
    historyRef.current = new HistoryManager({ getHTML, setHTML: setHTMLInternal, onChange: bump });
  }

  const exec = useCallback(
    (name, value) => {
      selectionRef.current.restore();
      commandsRef.current.exec(apiRef.current, name, value);
      onChange?.(getHTML());
      bump();
    },
    [bump, getHTML, onChange]
  );

  const handleInput = useCallback(() => {
    historyRef.current.snapshot();
    onChange?.(getHTML());
  }, [getHTML, onChange]);

  const openPopup = useCallback((name, render, large, persistent) => setActivePopup({ name, render, large, persistent }), []);
  const closePopup = useCallback(() => setActivePopup(null), []);

  const undo = useCallback(() => {
    historyRef.current.undo();
    onChange?.(getHTML());
    bump();
  }, [bump, getHTML, onChange]);

  const redo = useCallback(() => {
    historyRef.current.redo();
    onChange?.(getHTML());
    bump();
  }, [bump, getHTML, onChange]);

  const setHTML = useCallback(
    (html) => {
      setHTMLInternal(html);
      historyRef.current.snapshotNow();
      bump();
    },
    [bump, setHTMLInternal]
  );

  // Switching to 'source' mode unmounts EditorCore and mounts SourceView
  // in the same render. By the time SourceView's own effects run, React
  // has already nulled containerRef.current (it happens synchronously
  // during commit, before any effect fires) — so SourceView calling
  // getHTML() itself reads empty. The fix is capturing the HTML *here*,
  // synchronously in this same click-handler tick, while EditorCore is
  // still mounted and the ref is still valid — before setMode even runs.
  const changeMode = useCallback(
    (newMode) => {
      if (newMode === 'source' && mode !== 'source') {
        sourceContentRef.current = getHTML();
      }
      setMode(newMode);
    },
    [mode, getHTML]
  );

  // Register every plugin's custom commands + run init(), on mount. No
  // "only once" guard here on purpose: StrictMode intentionally runs this
  // as mount -> cleanup -> mount to catch exactly the bug a guard like
  // that causes — init() attaches things (e.g. codeBlock's click
  // delegation), destroy() removes them, and a guard that blocks the
  // second init() leaves things permanently torn down. Every step here is
  // safe to run more than once: content-loading and command registration
  // are idempotent, and historyRef.current.snapshotNow() already no-ops
  // if nothing changed since the last snapshot.
  useEffect(() => {
    if (containerRef.current && initialValue) {
      // Sanitized on the way in — see setHTMLInternal above for why this
      // is the boundary that matters. initialValue is the one entry
      // point that boundary doesn't already cover, since it lands
      // directly in the DOM before any editor.setHTML() call exists to
      // pass through.
      containerRef.current.innerHTML = sanitizeHtml(initialValue);
    }

    plugins.forEach((plugin) => {
      Object.entries(plugin.commands || {}).forEach(([name, handler]) => {
        commandsRef.current.register(name, handler);
      });
    });
    plugins.forEach((plugin) => plugin.init?.(apiRef.current));
    historyRef.current.snapshotNow();

    return () => plugins.forEach((plugin) => plugin.destroy?.(apiRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute toolbar active-state whenever the selection moves inside the editor.
  useEffect(() => {
    const handler = () => {
      const root = containerRef.current;
      const sel = window.getSelection();
      if (!root || !sel || sel.rangeCount === 0) return;
      if (root.contains(sel.anchorNode)) {
        selectionRef.current.save();
        bump();
      }
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [bump]);

  const api = {
    containerRef,
    rootRef,
    mode,
    setMode: changeMode,
    getSourceContent: () => sourceContentRef.current,
    fullscreen,
    toggleFullscreen: () => setFullscreen((f) => !f),
    readOnly,
    locked,
    // Stable, always-fresh accessor for the same value - see the
    // lockedRef comment above for exactly why plain `locked` isn't
    // enough for every consumer of this object. Everything that reads
    // state through useEditor() during a normal render should keep using
    // the plain `locked` boolean above (it's simpler, and Context
    // re-renders make it correct there); isLocked() exists specifically
    // for the one-time-captured-closure case.
    isLocked: () => lockedRef.current,
    toggleLock: () => setLocked((l) => !l),
    theme,
    toggleTheme,
    exec,
    queryState: (name, value) => commandsRef.current.queryState(name, value),
    queryValue: (name) => commandsRef.current.queryValue(name),
    registerCommand: (name, handler) => commandsRef.current.register(name, handler),
    selection: selectionRef.current,
    history: {
      undo,
      redo,
      canUndo: () => historyRef.current.canUndo(),
      canRedo: () => historyRef.current.canRedo(),
      snapshot: () => historyRef.current.snapshot(),
    },
    getHTML,
    setHTML,
    onInput: handleInput,
    openPopup,
    closePopup,
    activePopup,
  };
  apiRef.current = api; // keep the ref current *after* every render for the closures above
  lockedRef.current = locked;

  return <EditorContext.Provider value={api}>{children}</EditorContext.Provider>;
}

export default EditorContext;
