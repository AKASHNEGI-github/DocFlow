import InsertTableForm from '../components/popups/InsertTableForm';

export default {
  name: 'insertTable',
  button: {
    icon: 'table',
    tooltip: 'Insert table',
    type: 'popup',
    renderPopup: (editor, close) => <InsertTableForm editor={editor} onClose={close} />,
  },
};
