export default {
  name: 'horizontalLine',
  button: {
    icon: 'horizontalLine',
    tooltip: 'Insert horizontal line',
    type: 'instant',
    onClick: (editor) => editor.exec('insertHorizontalRule'),
  },
};
