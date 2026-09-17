export default {
  name: 'cut',
  button: {
    icon: 'cut',
    tooltip: 'Cut (Ctrl+X)',
    type: 'instant',
    onClick: (editor) => editor.exec('cut'),
  },
};
