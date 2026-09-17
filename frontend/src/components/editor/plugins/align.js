export default {
  name: 'align',
  button: {
    type: 'buttonGroup',
    tooltip: 'Align',
    options: [
      { icon: 'alignLeft', value: 'justifyLeft', label: 'Align left' },
      { icon: 'alignCenter', value: 'justifyCenter', label: 'Align center' },
      { icon: 'alignRight', value: 'justifyRight', label: 'Align right' },
      { icon: 'alignJustify', value: 'justifyFull', label: 'Justify' },
    ],
    isActive: (editor, value) => editor.queryState(value),
    onClick: (editor, value) => editor.exec(value),
  },
};
