import SpecialCharacterForm from '../components/popups/SpecialCharacterForm';

export default {
  name: 'specialCharacter',
  button: {
    icon: 'specialCharacter',
    tooltip: 'Insert special character',
    type: 'popup',
    renderPopup: (editor, close) => <SpecialCharacterForm editor={editor} onClose={close} />,
  },
};
