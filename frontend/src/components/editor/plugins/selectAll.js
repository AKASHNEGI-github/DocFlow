export default {
  name: 'selectAll',
  button: {
    icon: 'selectAll',
    tooltip: 'Select all',
    type: 'instant',
    onClick: (editor) => editor.exec('selectAll'),
  },
};
