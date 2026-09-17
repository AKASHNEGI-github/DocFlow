import { openPrintWindow } from '../core/printUtils';

// Used to be two buttons — this one and a separate "Export to PDF" — but
// both ever did was call openPrintWindow() with a different window title;
// there's no separate PDF pipeline (see printUtils.js), so the second
// button was a pure duplicate. Folded into one, with the tooltip saying
// so directly, rather than keeping two toolbar entries for one action.
export default {
  name: 'print',
  button: {
    icon: 'print',
    tooltip: "Print / Save as PDF (choose 'Save as PDF' as the destination)",
    type: 'instant',
    onClick: (editor) => openPrintWindow(editor.getHTML(), 'Document'),
  },
};
