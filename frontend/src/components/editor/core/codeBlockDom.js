import { highlightCode } from './highlight';

const ICON_COPY =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>';
const ICON_EDIT =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
const ICON_CHECK =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"></path></svg>';
const ICON_TRASH =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
const ICON_CLOSE =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
const ICON_PLUS =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function tabLabel(tab) {
  return tab.filename || tab.language;
}

// Builds the whole widget from a list of { language, filename, code }
// tabs. contenteditable="false" on the wrapper keeps the browser's native
// rich-text editing from mangling it; the buttons inside still work as
// normal DOM elements — see codeBlock.jsx for the click delegation.
export function buildCodeBlock(tabs) {
  const wrapper = document.createElement('div');
  wrapper.className = 'jc-code-block';
  wrapper.contentEditable = 'false';
  wrapper.setAttribute('data-jc-widget', 'code');

  const tabsHtml = tabs
    .map(
      (t, i) =>
        `<button type="button" class="jc-code-tab${i === 0 ? ' jc-code-tab--active' : ''}" data-tab="${i}">${escapeHtml(tabLabel(t))}</button>`
    )
    .join('');

  const panelsHtml = tabs
    .map((t, i) => {
      const highlighted = highlightCode(t.code, t.language);
      // data-filename backs a CSS-only label (::before) shown in Preview/
      // Print, where multiple tabs render stacked instead of switched —
      // no visible DOM element for it in the live editor, on purpose (the
      // tab button above already shows this; a second copy just added
      // unwanted vertical space before/after the code).
      return `<div class="jc-code-panel${i === 0 ? ' jc-code-panel--active' : ''}" data-tab="${i}" data-language="${escapeHtml(t.language)}" data-filename="${escapeHtml(tabLabel(t))}"${i === 0 ? '' : ' style="display:none"'}>
        <pre class="jc-code-pre"><code class="hljs language-${escapeHtml(t.language)}">${highlighted}</code></pre>
      </div>`;
    })
    .join('');

  wrapper.innerHTML = `<div class="jc-code-header">
      <div class="jc-code-tabs">${tabsHtml}<button type="button" class="jc-code-tab-add" data-action="add-tab" title="Add another file">${ICON_PLUS}</button></div>
      <div class="jc-code-actions">
        <button type="button" class="jc-code-action" data-action="copy" title="Copy code">${ICON_COPY}<span class="jc-code-action-label">Copy</span></button>
        <button type="button" class="jc-code-action" data-action="edit" title="Edit">${ICON_EDIT}<span class="jc-code-action-label">Edit</span></button>
        <button type="button" class="jc-code-action" data-action="delete-tab" title="Delete this tab">${ICON_TRASH}<span class="jc-code-action-label">Delete tab</span></button>
        <button type="button" class="jc-code-action jc-code-action--close" data-action="delete-block" title="Delete code block">${ICON_CLOSE}</button>
      </div>
    </div>
    <div class="jc-code-panels">${panelsHtml}</div>`;

  return wrapper;
}

// Appends a new tab to an EXISTING block — the piece that was missing:
// buildCodeBlock only ever ran at insert time, with no way afterward to
// grow the same block. Switches to the new tab immediately.
export function addTabToBlock(block, tab) {
  const tabsContainer = block.querySelector('.jc-code-tabs');
  const panelsContainer = block.querySelector('.jc-code-panels');
  const addButton = tabsContainer.querySelector('.jc-code-tab-add');
  const newIndex = block.querySelectorAll('.jc-code-tab').length;

  block.querySelectorAll('.jc-code-tab').forEach((t) => t.classList.remove('jc-code-tab--active'));
  block.querySelectorAll('.jc-code-panel').forEach((p) => {
    p.classList.remove('jc-code-panel--active');
    p.style.display = 'none';
  });

  const tabBtn = document.createElement('button');
  tabBtn.type = 'button';
  tabBtn.className = 'jc-code-tab jc-code-tab--active';
  tabBtn.dataset.tab = String(newIndex);
  tabBtn.textContent = tabLabel(tab);
  tabsContainer.insertBefore(tabBtn, addButton);

  const highlighted = highlightCode(tab.code, tab.language);
  const panel = document.createElement('div');
  panel.className = 'jc-code-panel jc-code-panel--active';
  panel.dataset.tab = String(newIndex);
  panel.dataset.language = tab.language;
  panel.dataset.filename = tabLabel(tab);
  panel.innerHTML = `<pre class="jc-code-pre"><code class="hljs language-${escapeHtml(tab.language)}">${highlighted}</code></pre>`;
  panelsContainer.appendChild(panel);
}

export function getCodeBlockFromTarget(target) {
  return target.closest?.('.jc-code-block') || null;
}

export function switchTab(block, index) {
  block.querySelectorAll('.jc-code-tab').forEach((t) => {
    t.classList.toggle('jc-code-tab--active', Number(t.dataset.tab) === index);
  });
  block.querySelectorAll('.jc-code-panel').forEach((p) => {
    const active = Number(p.dataset.tab) === index;
    p.classList.toggle('jc-code-panel--active', active);
    p.style.display = active ? '' : 'none';
  });
}

function getActivePanel(block) {
  return block.querySelector('.jc-code-panel--active');
}

export function copyActiveTab(block) {
  const panel = getActivePanel(block);
  const code = panel?.querySelector('code')?.textContent || '';
  navigator.clipboard?.writeText(code).catch(() => {});
}

// Toggles the active tab between its highlighted <pre><code> view and a
// plain editable <textarea>. Re-highlights on save. contentEditable="false"
// on the outer wrapper doesn't stop a <textarea> inside it from being a
// normal, fully-editable form control.
//
// Returns true when this call just SAVED an edit (content actually
// changed) and false when it just opened edit mode (nothing changed yet)
// — the caller uses that to know whether to call editor.onInput(), the
// same way delete-tab/delete-block already do right next to this.
// Without it, saving a code edit was invisible to undo/redo and never
// reached the host app's onChange, since nothing else in this path ever
// told the rest of the editor a change had happened.
export function toggleEditActiveTab(block) {
  const panel = getActivePanel(block);
  if (!panel) return false;
  const pre = panel.querySelector('.jc-code-pre');
  const existingTextarea = panel.querySelector('.jc-code-edit-area');
  const editButton = block.querySelector('.jc-code-action[data-action="edit"]');

  if (existingTextarea) {
    const language = panel.dataset.language;
    const code = existingTextarea.value;
    const codeEl = pre.querySelector('code');
    codeEl.innerHTML = highlightCode(code, language);
    existingTextarea.remove();
    pre.style.display = '';
    if (editButton) editButton.innerHTML = `${ICON_EDIT}<span class="jc-code-action-label">Edit</span>`;
    return true;
  }

  const code = pre.querySelector('code')?.textContent || '';
  const textarea = document.createElement('textarea');
  textarea.className = 'jc-code-edit-area';
  textarea.value = code;
  textarea.spellcheck = false;
  pre.insertAdjacentElement('afterend', textarea);
  pre.style.display = 'none';
  textarea.focus();
  if (editButton) editButton.innerHTML = `${ICON_CHECK}<span class="jc-code-action-label">Save</span>`;
  return false;
}

export function deleteActiveTab(block) {
  const panels = Array.from(block.querySelectorAll('.jc-code-panel'));
  if (panels.length <= 1) {
    block.remove();
    return;
  }
  const activeIndex = panels.findIndex((p) => p.classList.contains('jc-code-panel--active'));
  panels[activeIndex].remove();
  block.querySelectorAll('.jc-code-tab')[activeIndex]?.remove();

  const remainingTabs = Array.from(block.querySelectorAll('.jc-code-tab'));
  const remainingPanels = Array.from(block.querySelectorAll('.jc-code-panel'));
  remainingTabs.forEach((t, i) => { t.dataset.tab = String(i); });
  remainingPanels.forEach((p, i) => { p.dataset.tab = String(i); });

  switchTab(block, Math.max(0, activeIndex - 1));
}

export function deleteBlock(block) {
  block.remove();
}
