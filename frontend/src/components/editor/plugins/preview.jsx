import PreviewDialog from '../components/popups/PreviewDialog';

export default {
  name: 'preview',
  button: {
    icon: 'preview',
    tooltip: 'Preview',
    type: 'popup',
    large: true,
    renderPopup: (editor, close) => <PreviewDialog editor={editor} onClose={close} />,
  },
};
