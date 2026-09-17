export default {
  name: 'copy',
  button: {
    icon: 'copy',
    tooltip: 'Copy (Ctrl+C)',
    type: 'instant',
    onClick: (editor) => editor.exec('copy'),
  },
};
