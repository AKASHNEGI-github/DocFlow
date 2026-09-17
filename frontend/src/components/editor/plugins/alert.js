import { ALERT_TYPES, insertAlert } from '../core/alertUtils';

export default {
  name: 'alert',
  commands: {
    alert: (editor, type) => insertAlert(editor, type),
  },
  button: {
    type: 'dropdown',
    tooltip: 'Insert alert (Note, Tip, Important, Caution, Warning)',
    icon: 'alert',
    placeholder: 'Alert',
    options: ALERT_TYPES,
    getValue: () => '', // no persistent "current" value — it's an insert action, not a state toggle
    onSelect: (editor, value) => editor.exec('alert', value),
  },
};
