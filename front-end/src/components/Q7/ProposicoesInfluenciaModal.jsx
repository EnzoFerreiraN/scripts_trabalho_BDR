import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { pct } from '../../lib/formatters';
import Modal from '../shared/Modal';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorBox from '../shared/ErrorBox';

/**
 * Modal que exibe as proposições aprovadas no plenário que compõem o score
 * de influência de um deputado.
 *
 * Props:
 *   dep     — objeto { id, nome, score_ponderado, pct_influencia, urlFoto }
 *   onClose — callback para fechar
 */
export default function ProposicoesInfluenciaModal({ dep, onClose }) {
  const [proposicoes, setProposicoes] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch(`/q7/proposicoes-influencia/${dep.id}`)
      .then(setProposicoes)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [dep.id]);

  const scoreTotal = proposicoes.reduce((s, p) => s + p.contribuicao, 0);

  return (
    <Modal title={`Proposições — ${dep.nome}`} onClose={onClose} wide>
      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0.5rem 1.25rem 1rem' }}>
        Score ponderado: <strong>{dep.score_ponderado?.toFixed(2)}</strong>
        {' · '}Influência: <strong>{dep.pct_influencia?.toFixed(1)}</strong>
        {!loading && proposicoes.length > 0 && (
          <> · Soma das contribuições: <strong>{scoreTotal.toFixed(2)}</strong></>
        )}
      </p>

      {loading && <div style={{ padding: '1rem 1.25rem' }}><LoadingSpinner text="Carregando proposições…" /></div>}
      {error   && <div style={{ padding: '0 1.25rem 1rem' }}><ErrorBox message={error} /></div>}

      {!loading && !error && (
        <div style={{ overflowY: 'auto', maxHeight: '480px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
                <th style={thStyle}>Proposição</th>
                <th style={thStyle}>Ementa</th>
                <th style={thStyle}>Papel</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Peso</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Margem</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Pontos</th>
              </tr>
            </thead>
            <tbody>
              {proposicoes.map((p, i) => {
                const principal = p.ordemAssinatura <= 1 || p.proponente === 1;
                return (
                  <tr key={p.id} style={i % 2 === 0 ? rowEven : rowOdd}>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                      {p.siglaTipo} {p.numero}/{p.ano}
                    </td>
                    <td style={{ ...tdStyle, fontSize: '0.78rem', color: 'var(--muted)', maxWidth: '260px' }}>
                      <span style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {p.ementa || '—'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span
                        className="badge"
                        style={{
                          background: principal ? 'rgba(79,70,229,0.12)' : 'rgba(0,0,0,0.06)',
                          color: principal ? 'var(--accent, #4f46e5)' : 'var(--muted)',
                          fontSize: '0.7rem',
                        }}
                      >
                        {principal ? 'Autor principal' : `${p.ordemAssinatura}ª assin.`}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {p.peso.toFixed(2)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {pct(p.margem * 100)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--accent, #4f46e5)' }}>
                      {p.contribuicao.toFixed(3)}
                    </td>
                  </tr>
                );
              })}
              {proposicoes.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>
                    Nenhuma proposição encontrada para este deputado.
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
