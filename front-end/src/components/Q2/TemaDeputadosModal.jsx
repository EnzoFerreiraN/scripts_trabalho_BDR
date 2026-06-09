import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { fmtN } from '../../lib/formatters';
import Modal from '../shared/Modal';
import Avatar from '../shared/Avatar';
import Badge from '../shared/Badge';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorBox from '../shared/ErrorBox';

/**
 * Modal que exibe os deputados com mais proposições para um tema.
 * Props:
 *   tema    — objeto { codTema, tema, num_proposicoes, num_deputados }
 *   onClose — callback para fechar
 */
export default function TemaDeputadosModal({ tema, onClose }) {
  const [deputados, setDeputados] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch(`/q2/deputados-por-tema?cod_tema=${tema.codTema}&limit=15`)
      .then(setDeputados)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tema.codTema]);

  return (
    <Modal title={`Deputados — ${tema.tema}`} onClose={onClose} wide>
      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0.5rem 1.25rem 1rem' }}>
        {fmtN(tema.num_proposicoes)} proposições · {fmtN(tema.num_deputados)} deputados envolvidos
        · mostrando os 15 com mais proposições
      </p>

      {loading && <div style={{ padding: '1rem 1.25rem' }}><LoadingSpinner text="Carregando deputados…" /></div>}
      {error   && <div style={{ padding: '0 1.25rem 1rem' }}><ErrorBox message={error} /></div>}

      {!loading && !error && (
        <div style={{ overflowY: 'auto', maxHeight: '420px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Deputado</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Proposições</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Partido</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>UF</th>
              </tr>
            </thead>
            <tbody>
              {deputados.map((dep, i) => (
                <tr key={dep.id} style={i % 2 === 0 ? rowEven : rowOdd}>
                  <td style={{ ...tdStyle, color: 'var(--muted)', width: '2rem' }}>{i + 1}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Avatar urlFoto={dep.urlFoto} nome={dep.nome} size="sm" />
                      <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{dep.nome}</span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtN(dep.num_proposicoes)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {dep.partido ? <Badge variant="blue">{dep.partido}</Badge> : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', fontSize: '0.82rem' }}>
                    {dep.uf ?? '—'}
                  </td>
                </tr>
              ))}
              {deputados.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>
                    Nenhum deputado encontrado para este tema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

const thStyle = {
  padding: '0.5rem 1rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  textAlign: 'left',
  color: 'var(--muted)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '0.55rem 1rem',
  fontSize: '0.85rem',
  color: 'var(--ink)',
  borderBottom: '1px solid var(--border)',
};

const rowEven = {};
const rowOdd  = { background: 'rgba(0,0,0,0.015)' };
