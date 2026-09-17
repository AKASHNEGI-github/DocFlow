export default {
  name: 'sourceMode',
  button: {
    icon: 'sourceCode',
    tooltip: 'View content in HTML output',
    type: 'toggle',
    isActive: (editor) => editor.mode === 'source',
    onClick: (editor) => editor.setMode(editor.mode === 'source' ? 'wysiwyg' : 'source'),
  },
};
