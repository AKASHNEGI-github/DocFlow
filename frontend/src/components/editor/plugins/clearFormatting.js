export default {
  name: 'clearFormatting',
  button: {
    icon: 'clearFormatting',
    tooltip: 'Clear formatting',
    type: 'instant',
    onClick: (editor) => editor.exec('removeFormat'),
  },
};
