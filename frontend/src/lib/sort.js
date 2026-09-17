/**
 * The full set of sort options FilterPanel can offer. Not every page
 * supports every option - a page passes a `fields` map (see
 * availableSortOptions/sortRows below) naming which of name/created/
 * updated it actually has data for, and whichever options that map
 * doesn't cover are left out of the menu rather than shown broken.
 */
export const SORT_OPTIONS = [
  { key: 'nameAsc', group: 'name', label: 'Name: A to Z' },
  { key: 'nameDesc', group: 'name', label: 'Name: Z to A' },
  { key: 'createdNewest', group: 'created', label: 'Created: Newest First' },
  { key: 'createdOldest', group: 'created', label: 'Created: Oldest First' },
  { key: 'updatedNewest', group: 'updated', label: 'Updated: Newest First' },
  { key: 'updatedOldest', group: 'updated', label: 'Updated: Oldest First' },
];

/**
 * `fields.name` / `fields.created` / `fields.updated` are each either a
 * string key (`'title'`) for a flat property, or a function
 * `(row) => value` for anything nested (Deletion's rows keep the
 * document under `row.document`) or otherwise not a straight property
 * lookup. Omitting a key entirely (e.g. no `updated`) is how a page
 * says "I don't have that data" - see Users (no updatedAt column at
 * all) and Live/Home (document_live only tracks publishedAt).
 */
function readField(row, accessor) {
  if (accessor == null) return undefined;
  return typeof accessor === 'function' ? accessor(row) : row[accessor];
}

export function availableSortOptions(fields = {}) {
  return SORT_OPTIONS.filter((opt) => fields[opt.group] != null);
}

export function sortRows(rows, sortKey, fields = {}) {
  const option = SORT_OPTIONS.find((opt) => opt.key === sortKey);
  const accessor = option && fields[option.group];
  if (!accessor) return rows; // unknown key, or this page has no field for it - leave order alone

  const sorted = [...rows];
  switch (sortKey) {
    case 'nameAsc':
      return sorted.sort((a, b) => String(readField(a, accessor) ?? '').localeCompare(String(readField(b, accessor) ?? '')));
    case 'nameDesc':
      return sorted.sort((a, b) => String(readField(b, accessor) ?? '').localeCompare(String(readField(a, accessor) ?? '')));
    case 'createdNewest':
    case 'updatedNewest':
      return sorted.sort((a, b) => new Date(readField(b, accessor) || 0).getTime() - new Date(readField(a, accessor) || 0).getTime());
    case 'createdOldest':
    case 'updatedOldest':
      return sorted.sort((a, b) => new Date(readField(a, accessor) || 0).getTime() - new Date(readField(b, accessor) || 0).getTime());
    default:
      return sorted;
  }
}
