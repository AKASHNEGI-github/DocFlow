import { SEPARATOR } from '../components/Toolbar';

import sourceMode from './sourceMode';
import undo from './undo';
import redo from './redo';

import bold from './bold';
import italic from './italic';
import underline from './underline';
import strikeThrough from './strikeThrough';
import superscript from './superscript';
import subscript from './subscript';

import { fontFamily, fontSize } from './font';

import clearFormatting from './clearFormatting';

import color from './color';

import orderedList from './orderedList';
import unorderedList from './unorderedList';
import outdent from './outdent';
import indent from './indent';

import align from './align';
import formatBlock from './formatBlock';
import lineHeight from './lineHeight';
import alert from './alert';

import insertLink from './insertLink';
import insertImage from './insertImage';
import insertFile from './insertFile';
import insertVideo from './insertVideo';
import insertTable from './insertTable';

import horizontalLine from './horizontalLine';
import specialCharacter from './specialCharacter';
import emoji from './emoji';

import cut from './cut';
import copy from './copy';
import paste from './paste';
import selectAll from './selectAll';

import findReplace from './findReplace';
import insertCode from './codeBlock';

import fullscreen from './fullscreen';
import lock from './lock';
import theme from './theme';
import preview from './preview';
import print from './print';
import about from './about';

// Commands-only — never appears on the toolbar itself (see tableTools.js).
import tableTools from './tableTools';

// Row 1 — the plugins you're formatting text with on every pass: toggles,
// fonts, colors, lists/indent, align, block style.
const row1 = [
  undo, redo, SEPARATOR,
  bold, italic, underline, strikeThrough, superscript, subscript, SEPARATOR,
  fontFamily, fontSize, SEPARATOR,
  color, clearFormatting, SEPARATOR,
  orderedList, unorderedList, outdent, indent, SEPARATOR,
  align, SEPARATOR,
  formatBlock, lineHeight, alert,
];

// Row 2 — additional plugins: inserting things, editing tools, view modes.
const row2 = [
  sourceMode, SEPARATOR,
  insertLink, insertImage, insertFile, insertVideo, insertTable, insertCode, SEPARATOR,
  horizontalLine, specialCharacter, emoji, SEPARATOR,
  cut, copy, paste, selectAll, SEPARATOR,
  findReplace, SEPARATOR,
  fullscreen, lock, theme, preview, print, about,
];

// Passed to <Toolbar rows={...} /> — a fixed 2D layout, not a flat list
// (see Toolbar.jsx for why).
export const toolbarRows = [row1, row2];

// Passed to <Editor plugins={...} /> — every plugin, flattened, plus the
// button-less ones (tableTools) — this is what EditorProvider registers
// commands and runs init() from. Reorder/trim toolbarRows freely; this
// list is derived from it automatically.
export const allPlugins = [
  ...row1.filter((p) => p !== SEPARATOR),
  ...row2.filter((p) => p !== SEPARATOR),
  tableTools,
];

export default allPlugins;
