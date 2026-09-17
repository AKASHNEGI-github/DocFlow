export default {
  name: 'subscript',
  button: {
    icon: 'subscript',
    tooltip: 'Subscript',
    type: 'toggle',
    isActive: (editor) => editor.queryState('subscript'),
    onClick: (editor) => editor.exec('subscript'),
  },
};
