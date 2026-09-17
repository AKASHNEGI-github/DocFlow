export default {
  name: 'strikeThrough',
  button: {
    icon: 'strikeThrough',
    tooltip: 'Strikethrough',
    type: 'toggle',
    isActive: (editor) => editor.queryState('strikeThrough'),
    onClick: (editor) => editor.exec('strikeThrough'),
  },
};
