// Code-block syntax highlighting needs its OWN light/dark swap, separate
// from the --jc-* CSS variables that theme the rest of the editor:
// highlight.js themes are a third-party stylesheet full of literal colors
// (.hljs-keyword, .hljs-string, ...), not something that reads our
// variables. Rather than hand-maintain a dark palette for a dozen
// language grammars, this swaps in highlight.js's own dark theme file
// wholesale, imported as raw text (Vite's ?inline) and written into a
// <style> tag this module owns — so switching themes is just replacing
// that tag's content, no re-render of any code block required.
import githubLight from 'highlight.js/styles/github.css?inline';
import githubDark from 'highlight.js/styles/github-dark.css?inline';

const STYLE_TAG_ID = 'jc-hljs-theme';

function getStyleTag() {
  let tag = document.getElementById(STYLE_TAG_ID);
  if (!tag) {
    tag = document.createElement('style');
    tag.id = STYLE_TAG_ID;
    document.head.appendChild(tag);
  }
  return tag;
}

export function applyHljsTheme(theme) {
  getStyleTag().textContent = theme === 'dark' ? githubDark : githubLight;
}
