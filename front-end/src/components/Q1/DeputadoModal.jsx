import { useState, useEffect, useRef } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { apiFetch } from '../../lib/api';
import { fmt, fmtN } from '../../lib/formatters';
import { PALETTE, legendColor } from '../../lib/chartDefaults';
import Avatar from '../shared/Avatar';
import Badge from '../shared/Badge';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorBox from '../shared/ErrorBox';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DeputadoModal({ dep, onClose }) {
  const [detail, setDetail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch(`/q1/gastos-detalhados/${dep.id}`)
      .then(setDetail)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [dep.id]);

  // Move focus into the dialog and close on Escape.
  useEffect(() => {
    modalRef.current?.focus();
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const top8 = detail.slice(0, 8);
  const donutData = {
    labels: top8.map(d => d.categoria),
    datasets: [{ data: top8.map(d => d.total), backgroundColor: PALETTE, borderWidth: 0 }]
  };
  const donutOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: legendColor, font: { size: 10 }, boxWidth: 12 } },
      tooltip: { callbacks: { label: c => ' ' + fmt(c.raw) } }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes de gastos de ${dep.nome}`}
        onClick={e => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>

        <div className="modal-header">
          <Avatar urlFoto={dep.urlFoto} nome={dep.nome} size="lg" />
          <div className="modal-dep-info">
            <div className="dep-name">{dep.nome}</div>
            <div className="dep-meta">
              <Badge variant="blue">{dep.partido}</Badge>
              <Badge variant="gray" style={{ marginLeft: '0.3rem' }}>{dep.uf}</Badge>
            </div>
            <div className="dep-total">{fmt(dep.total_gasto)} em {fmtN(dep.num_transacoes)} transações</div>
          </div>
        </div>

        {loading && <LoadingSpinner text="Carregando detalhes…" />}
        {error && <ErrorBox message={error} />}
        {!loading && !error && detail.length > 0 && (
          <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
            <div className="card">
              <h3>Distribuição por categoria</h3>
              <div className="chart-wrap">
                <Doughnut data={donutData} options={donutOpts}
                  role="img"
                  aria-label={`Distribuição dos gastos de ${dep.nome} por categoria${top8.length ? `. Maior categoria: ${top8[0].categoria}, ${fmt(top8[0].total)}.` : '.'}`} />
              </div>
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              <h3>Por categoria</h3>
              <div className="table-wrap" style={{ maxHeight: '280px' }}>
                <table>
                  <thead><tr>
                    <th>Categoria</th>
                    <th style={{ textAlign: 'right' }}>Transações</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Média</th>
                  </tr></thead>
                  <tbody>
                    {detail.map(d => (
                      <tr key={d.categoria}>
                        <td style={{ maxWidth: '160px', whiteSpace: 'normal', lineHeight: '1.2', fontSize: '0.78rem' }}>{d.categoria}</td>
                        <td style={{ textAlign: 'right' }}>{fmtN(d.num_transacoes)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(d.total)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{fmt(d.media)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
