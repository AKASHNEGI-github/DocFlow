export default {
  name: 'undo',
  button: {
    icon: 'undo',
    tooltip: 'Undo (Ctrl+Z)',
    type: 'instant',
    isDisabled: (editor) => !editor.history.canUndo(),
    onClick: (editor) => editor.history.undo(),
  },
};
