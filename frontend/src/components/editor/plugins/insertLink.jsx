import InsertLinkForm from '../components/popups/InsertLinkForm';

export default {
  name: 'insertLink',
  button: {
    icon: 'link',
    tooltip: 'Insert link',
    type: 'popup',
    renderPopup: (editor, close) => <InsertLinkForm editor={editor} onClose={close} />,
  },
};
