import hljs from 'highlight.js/lib/common';
// Theme CSS is applied separately (see core/hljsTheme.js) so it can swap
// between light/dark rather than being locked to one via a static import.

// A curated subset for the language <select> — everything here is part
// of the "common" bundle above, so it's guaranteed to actually highlight.
export const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'xml', label: 'HTML / XML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'sql', label: 'SQL' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'plaintext', label: 'Plain text' },
];

export function highlightCode(code, language) {
  try {
    return hljs.highlight(code, { language, ignoreIllegals: true }).value;
  } catch {
    return hljs.highlightAuto(code).value;
  }
}
