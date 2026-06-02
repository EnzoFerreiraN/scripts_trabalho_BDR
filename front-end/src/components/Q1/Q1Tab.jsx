import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend
} from 'chart.js';
import { apiFetch } from '../../lib/api';
import { fmt, fmtN, shortName } from '../../lib/formatters';
import { PALETTE, hBarData, hBarOptions, baseFont, gridColor } from '../../lib/chartDefaults';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorBox from '../shared/ErrorBox';
import Avatar from '../shared/Avatar';
import Badge from '../shared/Badge';
import RankNum from '../shared/RankNum';
import DeputadoCard from './DeputadoCard';
import DeputadoModal from './DeputadoModal';
import InfoCard from '../shared/InfoCard';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Q1Tab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDep, setSelectedDep] = useState(null);

  useEffect(() => {
    apiFetch('/q1/gastos-deputados?limit=200')
      .then(setData)
      .catch(e => setError('Erro ao carregar: ' + e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox message={error} />;
  if (!data.length) return null;

  const total = data.reduce((s, d) => s + d.total_gasto, 0);
  const top5  = data.slice(0, 5);
  const top20 = data.slice(0, 20);
  const top50 = data.slice(0, 50);

  const barData = hBarData(
    top20.map(d => shortName(d.nome).split(' ').slice(0, 2).join(' ')),
    top20.map(d => d.total_gasto)
  );
  const barOpts = hBarOptions(fmt);

  const byPartido = {};
  top50.forEach(d => { byPartido[d.partido] = (byPartido[d.partido] || 0) + d.total_gasto; });
  const sorted = Object.entries(byPartido).sort((a, b) => b[1] - a[1]);
  const partidoData = {
    labels: sorted.map(e => e[0]),
    datasets: [{ data: sorted.map(e => e[1]), backgroundColor: PALETTE, borderRadius: 4 }]
  };
  const partidoOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + fmt(c.raw) } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#8892a4', font: baseFont } },
      y: { grid: { color: gridColor }, ticks: { color: '#8892a4', font: baseFont, callback: v => fmt(v) } }
    }
  };

  return (
    <>
      <p className="section-title">Deputados com mais gastos</p>
      <p className="section-subtitle">Gastos da CEAP por parlamentar · Período 2023–2026</p>

      <div className="stat-row">
        <div className="stat">
          <div className="val">{fmtN(data.length)}</div>
          <div className="lbl">Deputados com gastos</div>
        </div>
        <div className="stat">
          <div className="val">{fmt(total)}</div>
          <div className="lbl">Total gasto</div>
        </div>
        <div className="stat">
          <div className="val">{fmt(total / data.length)}</div>
          <div className="lbl">Média por deputado</div>
        </div>
        <div className="stat">
          <div className="val">{fmt(data[0].total_gasto)}</div>
          <div className="lbl">Maior gasto individual</div>
        </div>
      </div>

      <div className="deputy-cards">
        {top5.map((dep, i) => (
          <DeputadoCard key={dep.id} dep={dep} rank={i + 1} onClick={setSelectedDep} />
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <h3>Top 20 por total gasto</h3>
          <div className="chart-wrap-tall"><Bar data={barData} options={barOpts} /></div>
        </div>
        <div className="card">
          <h3>Distribuição por partido (top 50)</h3>
          <div className="chart-wrap-tall"><Bar data={partidoData} options={partidoOpts} /></div>
        </div>
      </div>

      <div className="card">
        <h3>Lista completa</h3>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>#</th><th>Deputado</th><th>Partido</th><th>UF</th>
              <th style={{ textAlign: 'right' }}>Transações</th>
              <th style={{ textAlign: 'right' }}>Total gasto</th>
            </tr></thead>
            <tbody>
              {data.map((dep, i) => (
                <tr key={dep.id} className="clickable" onClick={() => setSelectedDep(dep)} title="Ver detalhes de gastos">
                  <td><RankNum rank={i + 1} /></td>
                  <td>
                    <div className="td-deputy">
                      <Avatar urlFoto={dep.urlFoto} nome={dep.nome} size="sm" />
                      <span className="td-deputy-name">{dep.nome}</span>
                    </div>
                  </td>
                  <td><Badge variant="blue">{dep.partido}</Badge></td>
                  <td>{dep.uf}</td>
                  <td style={{ textAlign: 'right' }}>{fmtN(dep.num_transacoes)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(dep.total_gasto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InfoCard>
        <p>Dados da <strong>CEAP (Cota para Exercício da Atividade Parlamentar)</strong> referentes ao período 2023–2026. Cada registro corresponde a uma nota fiscal de reembolso emitida pelo deputado.</p>
        <p>O <strong>total gasto</strong> é a soma de todos os valores líquidos (<code>vlrLiquido</code>) por parlamentar. Clique em qualquer deputado — nos cards ou na tabela — para ver o detalhamento por categoria de gasto.</p>
      </InfoCard>

      {selectedDep && (
        <DeputadoModal dep={selectedDep} onClose={() => setSelectedDep(null)} />
      )}
    </>
  );
}
