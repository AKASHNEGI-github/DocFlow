export default {
  name: 'theme',
  button: {
    // Shows the icon for what tapping it switches TO — a sun while dark
    // (tap for light), a moon while light (tap for dark) — the same
    // convention most editors/OSes use for this toggle specifically,
    // unlike the other toggle buttons on this toolbar (Lock, Full
    // screen), which stay on one icon and just highlight when active.
    icon: (editor) => (editor.theme === 'dark' ? 'sunTheme' : 'moonTheme'),
    tooltip: (editor) => (editor.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'),
    type: 'toggle',
    isActive: (editor) => editor.theme === 'dark',
    onClick: (editor) => editor.toggleTheme(),
  },
};
