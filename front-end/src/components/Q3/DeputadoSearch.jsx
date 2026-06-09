import { useState, useId } from 'react';
import Avatar from '../shared/Avatar';

export default function DeputadoSearch({ deputados, value, onChange }) {
  const [query, setQuery] = useState(value ? value.nome : '');
  const [showList, setShowList] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const listId = useId();

  const filtered = query.length >= 2
    ? deputados.filter(d => d.nome.toLowerCase().includes(query.toLowerCase())).slice(0, 15)
    : [];

  const isOpen = showList && query.length >= 2;

  function selectDep(dep) {
    setQuery(dep.nome);
    setShowList(false);
    setActiveIdx(-1);
    onChange(dep);
  }

  function handleKeyDown(e) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && filtered.length > 0) {
        setShowList(true);
        setActiveIdx(0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setActiveIdx(i => Math.max(i - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && filtered[activeIdx]) {
        selectDep(filtered[activeIdx]);
      }
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setShowList(false);
      setActiveIdx(-1);
      e.preventDefault();
    }
  }

  return (
    <div className="dep-search-wrap">
      <label htmlFor={`${listId}-input`}>Deputado</label>
      <input
        id={`${listId}-input`}
        type="text"
        placeholder="Digite o nome…"
        value={query}
        style={{ minWidth: '240px' }}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-activedescendant={
          isOpen && activeIdx >= 0 ? `${listId}-opt-${activeIdx}` : undefined
        }
        onChange={e => {
          setQuery(e.target.value);
          setShowList(true);
          setActiveIdx(-1);
        }}
        onFocus={() => setShowList(true)}
        onBlur={() => setTimeout(() => { setShowList(false); setActiveIdx(-1); }, 150)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <div
          id={listId}
          className="dep-search-list"
          role="listbox"
          aria-label="Deputados"
        >
          {filtered.length === 0 ? (
            <div className="dep-search-empty" aria-live="polite">
              Nenhum deputado encontrado
            </div>
          ) : filtered.map((dep, idx) => (
            <div
              key={dep.id}
              id={`${listId}-opt-${idx}`}
              className={`dep-search-item${idx === activeIdx ? ' is-active' : ''}`}
              role="option"
              aria-selected={value?.id === dep.id}
              onMouseDown={e => { e.preventDefault(); selectDep(dep); }}
              onMouseEnter={() => setActiveIdx(idx)}
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
