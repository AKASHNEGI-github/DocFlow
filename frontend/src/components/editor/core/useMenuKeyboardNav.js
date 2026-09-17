import { useEffect } from 'react';

// Shared Escape-to-close + Arrow-key roving focus for the toolbar's
// lightweight inline popups (font/format dropdowns, the color picker, the
// table cell-color popup). The heavier popup FORMS (Insert Link/Image/
// Table, etc.) already get Escape-to-close for free from Modal.jsx — but
// these lighter ones render their own floating menu directly instead of
// going through Modal, and previously had no keyboard handling at all:
// only an outside-click listener closed them, so anyone navigating by
// keyboard (or a screen reader) could open one of these menus but never
// move through its options or close it without a mouse.
export function useMenuKeyboardNav(rootRef, open, setOpen) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      const root = rootRef.current;
      if (!root) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        root.querySelector('button')?.focus();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const focusable = Array.from(root.querySelectorAll('button:not(:disabled), [href], input'));
      if (!focusable.length) return;
      e.preventDefault();
      const currentIndex = focusable.indexOf(document.activeElement);
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (currentIndex + delta + focusable.length) % focusable.length;
      focusable[nextIndex].focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, rootRef, setOpen]);
}

export default useMenuKeyboardNav;
