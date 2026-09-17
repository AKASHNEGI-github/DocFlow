export default {
  name: 'bold',
  button: {
    icon: 'bold',
    tooltip: 'Bold (Ctrl+B)',
    type: 'toggle',
    isActive: (editor) => editor.queryState('bold'),
    onClick: (editor) => editor.exec('bold'),
  },
};
