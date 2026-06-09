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

export default function GastoDetalhePanel({ dep, onClear }) {
  const [detail, setDetail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const panelRef = useRef(null);

  // Scroll to panel and move focus when a new deputy is selected.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    panelRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    panelRef.current?.focus({ preventScroll: true });
  }, [dep.id]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setDetail([]);
    apiFetch(`/q1/gastos-detalhados/${dep.id}`)
      .then(setDetail)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [dep.id]);

  // Fallbacks para deputados vindos da busca (só têm id/nome/urlFoto).
  const totalCalc = detail.reduce((s, d) => s + d.total, 0);
  const transCalc = detail.reduce((s, d) => s + d.num_transacoes, 0);
  const totalExibido = dep.total_gasto ?? totalCalc;
  const transExibido = dep.num_transacoes ?? transCalc;

  const top8 = detail.slice(0, 8);
  const donutData = {
    labels: top8.map(d => d.categoria),
    datasets: [{ data: top8.map(d => d.total), backgroundColor: PALETTE, borderWidth: 0 }],
  };
  const donutOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: legendColor, font: { size: 10 }, boxWidth: 12 } },
      tooltip: { callbacks: { label: c => ' ' + fmt(c.raw) } },
    },
  };

  return (
    <div className="detail-panel" ref={panelRef} tabIndex={-1} aria-label={`Detalhes de gastos de ${dep.nome}`}>
      <div className="detail-hero">
        <Avatar urlFoto={dep.urlFoto} nome={dep.nome} size="lg" />
        <div className="detail-hero-info">
          <div className="dep-name">{dep.nome}</div>
          {(dep.partido || dep.uf) && (
            <div className="dep-meta">
              {dep.partido && <Badge variant="blue">{dep.partido}</Badge>}
              {dep.uf && <Badge variant="gray" style={{ marginLeft: '0.3rem' }}>{dep.uf}</Badge>}
            </div>
          )}
          <div className="dep-total">{fmt(totalExibido)} em {fmtN(transExibido)} transações</div>
        </div>
        <button
          className="detail-clear"
          onClick={onClear}
          aria-label="Fechar detalhes"
          title="Fechar detalhes"
        >
          ✕
        </button>
      </div>

      {loading && <LoadingSpinner text="Carregando detalhes…" />}
      {error && <ErrorBox message={error} />}

      {!loading && !error && detail.length > 0 && (
        <div className="grid-2" style={{ marginTop: '1.25rem' }}>
          <div className="card">
            <h3>Distribuição por categoria</h3>
            <div className="chart-wrap">
              <Doughnut data={donutData} options={donutOpts}
                role="img"
                aria-label={`Distribuição dos gastos de ${dep.nome} por categoria${top8.length ? `. Maior: ${top8[0].categoria}, ${fmt(top8[0].total)}.` : '.'}`} />
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
  );
}
