import { wrapSelectionWithStyle, getCurrentStyleValue } from '../core/domUtils';

const FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  // Double quotes, not single — the browser's CSSOM normalizes a
  // multi-word font name to double quotes the moment it's assigned to
  // .style.fontFamily, even before any getComputedStyle() involvement.
  // Authoring these with single quotes meant the round-tripped value read
  // back out never matched the option that had just been applied, so the
  // dropdown could never show its own current selection.
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
];

const SIZES = ['8px', '10px', '12px', '14px', '16px', '18px', '24px', '32px', '48px'].map((v) => ({
  label: v.replace('px', ''),
  value: v,
}));

export const fontFamily = {
  name: 'fontFamily',
  commands: {
    fontFamily: (editor, value) => wrapSelectionWithStyle(editor, 'fontFamily', value),
  },
  button: {
    type: 'dropdown',
    tooltip: 'Font family',
    icon: 'font',
    placeholder: 'Font',
    options: FAMILIES,
    getValue: (editor) => getCurrentStyleValue(editor.containerRef.current, 'fontFamily'),
    onSelect: (editor, value) => editor.exec('fontFamily', value),
  },
};

export const fontSize = {
  name: 'fontSize',
  commands: {
    fontSize: (editor, value) => wrapSelectionWithStyle(editor, 'fontSize', value),
  },
  button: {
    type: 'dropdown',
    tooltip: 'Font size',
    icon: 'fontSize',
    placeholder: 'Size',
    options: SIZES,
    getValue: (editor) => getCurrentStyleValue(editor.containerRef.current, 'fontSize'),
    onSelect: (editor, value) => editor.exec('fontSize', value),
  },
};

export default [fontFamily, fontSize];
