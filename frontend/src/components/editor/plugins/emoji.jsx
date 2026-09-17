import EmojiPickerForm from '../components/popups/EmojiPickerForm';

export default {
  name: 'emoji',
  button: {
    icon: 'emoji',
    tooltip: 'Insert emoji',
    type: 'popup',
    renderPopup: (editor, close) => <EmojiPickerForm editor={editor} onClose={close} />,
  },
};
