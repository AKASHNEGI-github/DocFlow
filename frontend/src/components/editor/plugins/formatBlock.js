const BLOCKS = [
  { label: 'Paragraph', value: 'P' },
  { label: 'Heading 1', value: 'H1' },
  { label: 'Heading 2', value: 'H2' },
  { label: 'Heading 3', value: 'H3' },
  { label: 'Heading 4', value: 'H4' },
  { label: 'Quote', value: 'BLOCKQUOTE' },
];

export default {
  name: 'formatBlock',
  button: {
    type: 'dropdown',
    tooltip: 'Paragraph style',
    icon: 'formatBlock',
    placeholder: 'Format',
    options: BLOCKS,
    getValue: (editor) => (editor.queryValue('formatBlock') || '').toUpperCase(),
    onSelect: (editor, value) => editor.exec('formatBlock', `<${value}>`),
  },
};
