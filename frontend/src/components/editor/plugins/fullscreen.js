export default {
  name: 'fullscreen',
  button: {
    icon: 'fullscreen',
    tooltip: 'Full screen',
    type: 'toggle',
    isActive: (editor) => editor.fullscreen,
    onClick: (editor) => editor.toggleFullscreen(),
  },
};
