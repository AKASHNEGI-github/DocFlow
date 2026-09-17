export default {
  name: 'underline',
  button: {
    icon: 'underline',
    tooltip: 'Underline (Ctrl+U)',
    type: 'toggle',
    isActive: (editor) => editor.queryState('underline'),
    onClick: (editor) => editor.exec('underline'),
  },
};
