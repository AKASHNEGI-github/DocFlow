export default {
  name: 'italic',
  button: {
    icon: 'italic',
    tooltip: 'Italic (Ctrl+I)',
    type: 'toggle',
    isActive: (editor) => editor.queryState('italic'),
    onClick: (editor) => editor.exec('italic'),
  },
};
