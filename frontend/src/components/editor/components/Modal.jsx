import { useEffect } from 'react';
import { useEditor } from '../core/EditorContext';

export default function Modal() {
  const editor = useEditor();
  const popup = editor.activePopup;

  useEffect(() => {
    if (!popup) return undefined;
    // Persistent popups (see AddTabForm/InsertCodeForm below) only close
    // via their own Cancel/Save button — a substantial, easy-to-lose
    // amount of typed/pasted work (a whole code snippet, several tabs)
    // sitting in a form that vanishes the instant a click lands one pixel
    // outside it — clicking the code editor's own tab strip, a scrollbar,
    // anywhere — was frustrating enough to be worth special-casing,
    // unlike the simpler single-field popups (Insert Link, and similar)
    // where losing the one thing you typed is a minor, cheap mistake to
    // redo. Escape is blocked the same way, for the same reason: reported
    // as "should only disappear on Cancel or Save," not "unless you also
    // remember not to press Escape."
    if (popup.persistent) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') editor.closePopup();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popup]);

  if (!popup) return null;

  return (
    <div className="jc-modal-backdrop" onMouseDown={() => !popup.persistent && editor.closePopup()}>
      <div className={`jc-modal${popup.large ? ' jc-modal--large' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
        {popup.render(editor, editor.closePopup)}
      </div>
    </div>
  );
}
