/**
 * columns: [{ key, header, render?(row) }]. actions?(row) renders the
 * trailing Actions cell. Deliberately generic - every phase's list page
 * (Draft, Editorial, Review, Publication, Live, Deletion, Dashboard,
 * Users) passes its own column set and action buttons rather than this
 * component knowing anything about documents/requests itself.
 */
export default function DataTable({ columns, rows, rowKey, actions, onRowClick }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200/70 bg-paper-raised">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink-200/70 bg-paper-sunken/60 text-xs uppercase tracking-wide text-ink-500">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium">
                {col.header}
              </th>
            ))}
            {actions && <th className="px-4 py-3 font-medium text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-ink-100 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-paper-sunken/60' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 align-middle text-ink-800">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
              {actions && (
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1.5">{actions(row)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
