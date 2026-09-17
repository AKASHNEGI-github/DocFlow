import InsertImageForm from '../components/popups/InsertImageForm';

export default {
  name: 'insertImage',
  button: {
    icon: 'image',
    tooltip: 'Insert image',
    type: 'popup',
    renderPopup: (editor, close) => <InsertImageForm editor={editor} onClose={close} />,
  },
};
