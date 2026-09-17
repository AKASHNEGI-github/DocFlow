import AboutDialog from '../components/popups/AboutDialog';

export default {
  name: 'about',
  button: {
    icon: 'about',
    tooltip: 'About this editor',
    type: 'popup',
    renderPopup: (editor, close) => <AboutDialog onClose={close} />,
  },
};
