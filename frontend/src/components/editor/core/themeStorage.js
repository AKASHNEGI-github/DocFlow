// Theme preference: explicit user choice wins and is remembered; absent
// that, the OS/browser's own light-dark preference decides; absent that,
// light. Kept as one small module rather than inlined in EditorContext so
// the "how do we decide the starting theme" question has a single,
// obvious place to read.

const STORAGE_KEY = 'jc-editor-theme';

export function getInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage can throw (privacy mode, disabled storage, etc.) —
    // fall through to the system preference instead of failing the whole
    // editor over a theme lookup.
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function persistTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Non-fatal — the toggle still works for the rest of the session,
    // it just won't be remembered on reload.
  }
}
