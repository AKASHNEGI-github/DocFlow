export default {
  name: 'outdent',
  button: {
    icon: 'outdent',
    tooltip: 'Decrease indent',
    type: 'instant',
    onClick: (editor) => editor.exec('outdent'),
  },
};
