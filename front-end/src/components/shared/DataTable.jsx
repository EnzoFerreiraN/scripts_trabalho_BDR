import { useMemo, useState } from 'react';

/*
 * Sortable + searchable table.
 *
 * columns: array of {
 *   key,                     unique id
 *   header,                  column label
 *   align?: 'right',         text alignment
 *   bold?: bool,             bold cell text
 *   sortable?: bool,
 *   sortValue?: (row) => string|number,   defaults to row[key]
 *   render?: (row, displayIndex) => node,  defaults to row[key]
 * }
 * rows: array of data
 * rowKey: (row, i) => key
 * search?: { placeholder, accessor: (row) => string }
 * onRowClick?: (row) => void     makes rows clickable + keyboard-activatable
 * rowTitle?: string              title attr for clickable rows
 * initialSort?: { key, dir }     dir: 'asc' | 'desc'
 */
export default function DataTable({
  columns,
  rows,
  rowKey = (_, i) => i,
  search,
  onRowClick,
  rowTitle,
  initialSort = null,
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(initialSort);

  const sortValueOf = (col, row) => (col.sortValue ? col.sortValue(row) : row[col.key]);

  const processed = useMemo(() => {
    let out = rows;

    if (search && query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter(r => (search.accessor(r) || '').toLowerCase().includes(q));
    }

    if (sort) {
      const col = columns.find(c => c.key === sort.key);
      if (col) {
        const dir = sort.dir === 'desc' ? -1 : 1;
        out = [...out].sort((a, b) => {
          const va = sortValueOf(col, a);
          const vb = sortValueOf(col, b);
          if (va == null) return 1;
          if (vb == null) return -1;
          if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
          return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) * dir;
        });
      }
    }
    return out;
  }, [rows, query, sort, columns, search]);

  function toggleSort(col) {
    if (!col.sortable) return;
    setSort(prev => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: 'desc' };
      if (prev.dir === 'desc') return { key: col.key, dir: 'asc' };
      return null; // third click clears sort -> back to original order
    });
  }

  function ariaSort(col) {
    if (!sort || sort.key !== col.key) return 'none';
    return sort.dir === 'asc' ? 'ascending' : 'descending';
  }

  function handleRowKey(e, row) {
    if (!onRowClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick(row);
    }
  }

  return (
    <div>
      {(search) && (
        <div className="dt-toolbar">
          <div className="dt-search">
            <span className="dt-search-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="text"
              value={query}
              placeholder={search.placeholder || 'Buscar…'}
              aria-label={search.placeholder || 'Buscar na tabela'}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <span className="dt-count">
            {processed.length === rows.length
              ? `${rows.length} registros`
              : `${processed.length} de ${rows.length}`}
          </span>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={col.sortable ? 'dt-sortable' : undefined}
                  style={col.align === 'right' ? { textAlign: 'right' } : undefined}
                  aria-sort={col.sortable ? ariaSort(col) : undefined}
                  onClick={() => toggleSort(col)}
                  onKeyDown={col.sortable ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort(col); } } : undefined}
                  tabIndex={col.sortable ? 0 : undefined}
                  role={col.sortable ? 'button' : undefined}
                  title={col.sortable ? `Ordenar por ${col.header}` : undefined}
                >
                  {col.header}
                  {col.sortable && (
                    <span className="dt-sort-ind" aria-hidden="true">
                      {!sort || sort.key !== col.key ? '↕' : sort.dir === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processed.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>
                  {query ? `Nenhum resultado para "${query}".` : 'Sem registros.'}
                </td>
              </tr>
            ) : (
              processed.map((row, i) => (
                <tr
                  key={rowKey(row, i)}
                  className={onRowClick ? 'clickable' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? e => handleRowKey(e, row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  title={onRowClick ? rowTitle : undefined}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      style={{
                        ...(col.align === 'right' ? { textAlign: 'right' } : null),
                        ...(col.bold ? { fontWeight: 600 } : null),
                        ...(col.cellStyle || null),
                      }}
                    >
                      {col.render ? col.render(row, i) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
