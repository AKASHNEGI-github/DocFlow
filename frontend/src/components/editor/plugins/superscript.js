export default {
  name: 'superscript',
  button: {
    icon: 'superscript',
    tooltip: 'Superscript',
    type: 'toggle',
    isActive: (editor) => editor.queryState('superscript'),
    onClick: (editor) => editor.exec('superscript'),
  },
};
