import { useState, useRef } from 'react';
import { highlightMatches, replaceAllMatches, clearHighlights } from '../../core/findReplace';

export default function FindReplaceForm({ editor, onClose }) {
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [current, setCurrent] = useState(-1);
  const marksRef = useRef([]);

  const root = () => editor.containerRef.current;

  const goTo = (index, marks) => {
    marks.forEach((m) => m.classList.remove('jc-find-hit--current'));
    if (!marks.length) {
      setCurrent(-1);
      return;
    }
    const wrapped = ((index % marks.length) + marks.length) % marks.length;
    marks[wrapped].classList.add('jc-find-hit--current');
    marks[wrapped].scrollIntoView({ block: 'center', behavior: 'smooth' });
    setCurrent(wrapped);
  };

  const runFind = () => {
    const marks = highlightMatches(root(), find, matchCase);
    marksRef.current = marks;
    goTo(0, marks);
  };

  const handleNext = () => (marksRef.current.length ? goTo(current + 1, marksRef.current) : runFind());
  const handlePrev = () => (marksRef.current.length ? goTo(current - 1, marksRef.current) : runFind());

  const handleReplaceAll = () => {
    // The toolbar's Find & Replace button is already disabled while
    // locked (see Toolbar.jsx), so this popup normally can't even be
    // open — this is just a second line of defense in case the document
    // gets locked while it's already sitting open.
    if (editor.locked) return;
    replaceAllMatches(root(), find, replace, matchCase);
    marksRef.current = [];
    setCurrent(-1);
    editor.onInput();
  };

  const handleClose = () => {
    clearHighlights(root());
    onClose();
  };

  const total = marksRef.current.length;

  return (
    <div>
      <h3 className="jc-form-title">Find &amp; replace</h3>
      <div className="jc-form-field">
        <label htmlFor="jc-find">Find</label>
        <input
          id="jc-find"
          type="text"
          value={find}
          onChange={(e) => {
            setFind(e.target.value);
            // Forgetting the old marks isn't enough on its own — without
            // this, the previous query's highlights stay visible in the
            // content (just no longer trackable via Prev/Next) until the
            // next search runs.
            clearHighlights(root());
            marksRef.current = [];
            setCurrent(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (e.shiftKey) handlePrev();
              else handleNext();
            }
          }}
          autoFocus
        />
      </div>
      <div className="jc-form-field">
        <label htmlFor="jc-replace">Replace with</label>
        <input id="jc-replace" type="text" value={replace} onChange={(e) => setReplace(e.target.value)} />
      </div>
      <label className="jc-form-checkbox">
        <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />
        Match case
      </label>

      <div className="jc-find-nav">
        <span className="jc-find-count">
          {total > 0 ? `${current + 1} of ${total}` : find ? 'No matches' : ''}
        </span>
        <button type="button" className="jc-btn-secondary" onClick={handlePrev} disabled={!find}>
          Prev
        </button>
        <button type="button" className="jc-btn-secondary" onClick={handleNext} disabled={!find}>
          Next
        </button>
      </div>

      <div className="jc-form-actions">
        <button type="button" className="jc-btn-secondary" onClick={handleClose}>Close</button>
        <button type="button" className="jc-btn-primary" onClick={handleReplaceAll} disabled={!find}>
          Replace all
        </button>
      </div>
    </div>
  );
}
