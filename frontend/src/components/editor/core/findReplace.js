export function clearHighlights(root) {
  root.querySelectorAll('mark.jc-find-hit').forEach((m) => {
    m.replaceWith(document.createTextNode(m.textContent));
  });
  root.normalize();
}

function collectTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  return nodes;
}

// Returns the <mark> elements it created, in document order, so the
// caller can step through them (find next/previous) rather than only
// knowing a total count.
export function highlightMatches(root, query, matchCase) {
  clearHighlights(root);
  if (!query) return [];
  const marks = [];
  const normalize = (str) => (matchCase ? str : str.toLowerCase());
  const needle = normalize(query);

  collectTextNodes(root).forEach((textNode) => {
    const text = textNode.textContent;
    const hay = normalize(text);
    if (!hay.includes(needle)) return;
    const frag = document.createDocumentFragment();
    let last = 0;
    let idx;
    while ((idx = hay.indexOf(needle, last)) !== -1) {
      if (idx > last) frag.appendChild(document.createTextNode(text.slice(last, idx)));
      const mark = document.createElement('mark');
      mark.className = 'jc-find-hit';
      mark.textContent = text.slice(idx, idx + query.length);
      frag.appendChild(mark);
      marks.push(mark);
      last = idx + query.length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    textNode.parentNode.replaceChild(frag, textNode);
  });
  return marks;
}

export function replaceAllMatches(root, query, replacement, matchCase) {
  clearHighlights(root);
  if (!query) return 0;
  let count = 0;
  const normalize = (str) => (matchCase ? str : str.toLowerCase());
  const needle = normalize(query);

  collectTextNodes(root).forEach((textNode) => {
    const text = textNode.textContent;
    const hay = normalize(text);
    if (!hay.includes(needle)) return;
    let result = '';
    let last = 0;
    let idx;
    while ((idx = hay.indexOf(needle, last)) !== -1) {
      result += text.slice(last, idx) + replacement;
      count += 1;
      last = idx + query.length;
    }
    result += text.slice(last);
    textNode.textContent = result;
  });
  return count;
}
