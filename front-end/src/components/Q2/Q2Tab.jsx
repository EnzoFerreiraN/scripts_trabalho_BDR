import { useState, useEffect } from 'react';
import { Bar, Bubble } from 'react-chartjs-2';
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale,
  PointElement, BubbleController, Tooltip, Legend
} from 'chart.js';
import { apiFetch } from '../../lib/api';
import { fmtN } from '../../lib/formatters';
import { PALETTE, hBarData, hBarOptions, baseFont, gridColor } from '../../lib/chartDefaults';
import LoadingSpinner from '../shared/LoadingSpinner';
import RankNum from '../shared/RankNum';
import WordCloudCanvas from './WordCloud';
import InfoCard from '../shared/InfoCard';

ChartJS.register(BarElement, CategoryScale, LinearScale, PointElement, BubbleController, Tooltip, Legend);

export default function Q2Tab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/q2/ranking-temas')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data.length) return null;

  const top15 = data.slice(0, 15);

  const temasData = hBarData(top15.map(d => d.tema), top15.map(d => d.num_proposicoes));
  const temasOpts = hBarOptions(fmtN);

  const depsData = hBarData(top15.map(d => d.tema), top15.map(d => d.num_deputados));
  const depsOpts = hBarOptions(fmtN);

  const maxProp = Math.max(...data.map(d => d.num_proposicoes));
  const bubbleData = {
    datasets: data.map((d, i) => ({
      label: d.tema,
      data: [{
        x: d.num_deputados,
        y: d.num_proposicoes,
        r: Math.round(4 + (d.num_proposicoes / maxProp) * 36),
      }],
      backgroundColor: PALETTE[i % PALETTE.length] + 'bb',
      borderColor: PALETTE[i % PALETTE.length],
      borderWidth: 1,
    }))
  };
  const bubbleOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => {
            const d = data[ctx.datasetIndex];
            return [
              ` ${d.tema}`,
              ` Proposições: ${fmtN(d.num_proposicoes)}`,
              ` Deputados: ${fmtN(d.num_deputados)}`,
            ];
          }
        }
      }
    },
    scales: {
      x: {
        title: { display: true, text: 'Nº de deputados', color: '#8892a4', font: baseFont },
        grid: { color: gridColor },
        ticks: { color: '#8892a4', font: baseFont },
      },
      y: {
        title: { display: true, text: 'Nº de proposições', color: '#8892a4', font: baseFont },
        grid: { color: gridColor },
        ticks: { color: '#8892a4', font: baseFont, callback: v => fmtN(v) },
      }
    }
  };

  return (
    <>
      <p className="section-title">Principais eixos de atuação legislativa</p>
      <p className="section-subtitle">Proposições classificadas por tema da Câmara · Período 2023–2026</p>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Nuvem de palavras — eixos de atuação (tamanho ∝ nº de proposições)</h3>
        <WordCloudCanvas data={data} />
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Gráfico de bolhas — proposições × deputados (tamanho da bolha ∝ nº de proposições)</h3>
        <div className="chart-wrap-tall"><Bubble data={bubbleData} options={bubbleOpts} /></div>
      </div>

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <h3>Ranking de temas por nº de proposições</h3>
          <div className="chart-wrap-tall"><Bar data={temasData} options={temasOpts} /></div>
        </div>
        <div className="card">
          <h3>Nº de deputados por tema</h3>
          <div className="chart-wrap-tall"><Bar data={depsData} options={depsOpts} /></div>
        </div>
      </div>

      <div className="card">
        <h3>Tabela de temas</h3>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>#</th><th>Tema</th>
              <th style={{ textAlign: 'right' }}>Proposições</th>
              <th style={{ textAlign: 'right' }}>Deputados</th>
            </tr></thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={d.tema}>
                  <td><RankNum rank={i + 1} /></td>
                  <td>{d.tema}</td>
                  <td style={{ textAlign: 'right' }}>{fmtN(d.num_proposicoes)}</td>
                  <td style={{ textAlign: 'right' }}>{fmtN(d.num_deputados)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InfoCard>
        <p>Proposições legislativas (PLs, PDCs, etc.) classificadas por tema conforme o <strong>sistema de temas legislativos da Câmara dos Deputados</strong>. O número de proposições e de deputados envolvidos por tema foi apurado pelo vínculo entre as tabelas <code>autoria</code> e <code>classificacao</code>.</p>
        <p>O <strong>tamanho das palavras</strong> na nuvem e das bolhas no gráfico de bolhas é proporcional ao número de proposições registradas no tema.</p>
      </InfoCard>
    </>
  );
}
