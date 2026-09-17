export default {
  name: 'indent',
  button: {
    icon: 'indent',
    tooltip: 'Increase indent',
    type: 'instant',
    onClick: (editor) => editor.exec('indent'),
  },
};
