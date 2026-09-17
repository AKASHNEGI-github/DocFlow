export default {
  name: 'redo',
  button: {
    icon: 'redo',
    tooltip: 'Redo (Ctrl+Y)',
    type: 'instant',
    isDisabled: (editor) => !editor.history.canRedo(),
    onClick: (editor) => editor.history.redo(),
  },
};
