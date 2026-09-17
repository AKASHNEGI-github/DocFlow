export default {
  name: 'lock',
  button: {
    icon: 'lock',
    tooltip: 'Lock (read-only)',
    type: 'toggle',
    isActive: (editor) => editor.locked,
    onClick: (editor) => editor.toggleLock(),
  },
};
