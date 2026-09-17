import { applyBlockStyle, getCurrentStyleValue } from '../core/domUtils';

const HEIGHTS = ['1', '1.15', '1.5', '2', '2.5'].map((v) => ({ label: v, value: v }));

export default {
  name: 'lineHeight',
  commands: {
    lineHeight: (editor, value) => applyBlockStyle(editor, 'lineHeight', value),
  },
  button: {
    type: 'dropdown',
    tooltip: 'Line height',
    icon: 'lineHeight',
    placeholder: 'Spacing',
    options: HEIGHTS,
    getValue: (editor) => getCurrentStyleValue(editor.containerRef.current, 'lineHeight'),
    onSelect: (editor, value) => editor.exec('lineHeight', value),
  },
};
