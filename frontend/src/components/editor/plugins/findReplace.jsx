import FindReplaceForm from '../components/popups/FindReplaceForm';

export default {
  name: 'findReplace',
  button: {
    icon: 'find',
    tooltip: 'Find & replace',
    type: 'popup',
    renderPopup: (editor, close) => <FindReplaceForm editor={editor} onClose={close} />,
  },
};
