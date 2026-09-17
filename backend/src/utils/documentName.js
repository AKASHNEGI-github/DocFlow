/**
 * documents.document_name stores the composed "V{version} - {title}"
 * string and carries the table's UNIQUE constraint (see the long comment
 * in database/knex/migrations/006_create_documents.js for why). Every
 * place that needs the user's plain title back - an edit form's initial
 * value, or composing the *next* version's name during a Live upgrade -
 * goes through parseDocumentName() rather than re-implementing the
 * prefix strip inline.
 */
const PREFIX_PATTERN = /^V(\d+) - /;

export function composeDocumentName(versionNo, title) {
  return `V${versionNo} - ${title}`;
}

/**
 * Returns { versionNo, title }. Falls back to versionNo=null if the
 * stored value doesn't match the expected "V{n} - " prefix (defensive
 * only - every row this app writes goes through composeDocumentName, so
 * this should never actually happen against data the app itself wrote).
 */
export function parseDocumentName(documentName) {
  const match = PREFIX_PATTERN.exec(documentName);
  if (!match) {
    return { versionNo: null, title: documentName };
  }
  return {
    versionNo: Number(match[1]),
    title: documentName.slice(match[0].length),
  };
}
