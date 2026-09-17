import InsertVideoForm from '../components/popups/InsertVideoForm';

export default {
  name: 'insertVideo',
  button: {
    icon: 'video',
    tooltip: 'Insert video',
    type: 'popup',
    renderPopup: (editor, close) => <InsertVideoForm editor={editor} onClose={close} />,
  },
};
