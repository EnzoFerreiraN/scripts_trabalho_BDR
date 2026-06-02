import { useState } from 'react';
import Avatar from '../shared/Avatar';
import { initials } from '../../lib/formatters';

export default function DeputadoSearch({ deputados, value, onChange }) {
  const [query, setQuery] = useState(value ? value.nome : '');
  const [showList, setShowList] = useState(false);

  const filtered = query.length >= 2
    ? deputados.filter(d => d.nome.toLowerCase().includes(query.toLowerCase())).slice(0, 15)
    : [];

  function selectDep(dep) {
    setQuery(dep.nome);
    setShowList(false);
    onChange(dep);
  }

  return (
    <div className="dep-search-wrap">
      <label>Deputado</label>
      <input
        type="text"
        placeholder="Digite o nome…"
        value={query}
        style={{ minWidth: '240px' }}
        autoComplete="off"
        onChange={e => { setQuery(e.target.value); setShowList(true); }}
        onFocus={() => setShowList(true)}
        onBlur={() => setTimeout(() => setShowList(false), 150)}
      />
      {showList && filtered.length > 0 && (
        <div className="dep-search-list">
          {filtered.map(dep => (
            <div
              key={dep.id}
              className="dep-search-item"
              onMouseDown={e => { e.preventDefault(); selectDep(dep); }}
            >
              <Avatar urlFoto={dep.urlFoto} nome={dep.nome} size="xs" />
              <span>{dep.nome}</span>
              <span className="dep-search-id">ID {dep.id}</span>
            </div>
          ))}
        </div>
      )}
      {value && (
        <div className="dep-selected-badge">
          <span>ID selecionado:</span> <strong>{value.id}</strong>
        </div>
      )}
    </div>
  );
}
