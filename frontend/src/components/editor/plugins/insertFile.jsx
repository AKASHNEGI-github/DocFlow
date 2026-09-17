import InsertFileForm from '../components/popups/InsertFileForm';

export default {
  name: 'insertFile',
  button: {
    icon: 'file',
    tooltip: 'Insert file',
    type: 'popup',
    renderPopup: (editor, close) => <InsertFileForm editor={editor} onClose={close} />,
  },
};
