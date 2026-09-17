export default {
  name: 'unorderedList',
  button: {
    icon: 'unorderedList',
    tooltip: 'Bulleted list',
    type: 'toggle',
    isActive: (editor) => editor.queryState('insertUnorderedList'),
    onClick: (editor) => editor.exec('insertUnorderedList'),
  },
};
