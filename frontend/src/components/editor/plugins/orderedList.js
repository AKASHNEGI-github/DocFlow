export default {
  name: 'orderedList',
  button: {
    icon: 'orderedList',
    tooltip: 'Numbered list',
    type: 'toggle',
    isActive: (editor) => editor.queryState('insertOrderedList'),
    onClick: (editor) => editor.exec('insertOrderedList'),
  },
};
