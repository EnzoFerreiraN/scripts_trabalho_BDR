import { useState, useEffect } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale,
  Tooltip, Legend
} from 'chart.js';
import { apiFetch } from '../../lib/api';
import { fmtN, pct } from '../../lib/formatters';
import { PALETTE, baseFont, gridColor } from '../../lib/chartDefaults';
import LoadingSpinner from '../shared/LoadingSpinner';
import RankNum from '../shared/RankNum';
import InfoCard from '../shared/InfoCard';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Q4Tab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/q4/escolaridade')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data.length) return null;

  const labels = data.map(d => d.escolaridade);
  const vals   = data.map(d => d.num_deputados);
  const colors = data.map((_, i) => PALETTE[i % PALETTE.length]);

  const pieData = { labels, datasets: [{ data: vals, backgroundColor: colors, borderWidth: 0 }] };
  const pieOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'right', labels: { color: '#e2e6f0', font: baseFont, boxWidth: 12 } } }
  };

  const barData = { labels, datasets: [{ data: vals, backgroundColor: colors, borderRadius: 6 }] };
  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#8892a4', font: baseFont } },
      y: { grid: { color: gridColor }, ticks: { color: '#8892a4', font: baseFont } }
    }
  };

  return (
    <>
      <p className="section-title">Escolaridade dos deputados</p>
      <p className="section-subtitle">Distribuição por nível de escolaridade declarado · Legislatura 2023–2026</p>

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <h3>Pizza por escolaridade</h3>
          <div className="chart-wrap"><Doughnut data={pieData} options={pieOpts} /></div>
        </div>
        <div className="card">
          <h3>Barras — deputados por nível</h3>
          <div className="chart-wrap"><Bar data={barData} options={barOpts} /></div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Escolaridade</th>
              <th style={{ textAlign: 'right' }}>Deputados</th>
              <th style={{ textAlign: 'right' }}>%</th>
            </tr></thead>
            <tbody>
              {data.map(d => (
                <tr key={d.escolaridade}>
                  <td>{d.escolaridade}</td>
                  <td style={{ textAlign: 'right' }}>{fmtN(d.num_deputados)}</td>
                  <td style={{ textAlign: 'right' }}>{pct(d.pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InfoCard>
        <p>Escolaridade <strong>declarada pelo próprio parlamentar</strong> no cadastro oficial da Câmara dos Deputados. Os dados refletem as informações prestadas no momento do registro.</p>
        <p><strong>Atenção:</strong> não há verificação independente da escolaridade informada — o dado é autorreferido.</p>
      </InfoCard>
    </>
  );
}
