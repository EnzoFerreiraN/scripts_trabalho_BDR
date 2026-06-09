import { useState, useEffect } from 'react';
import { Bubble } from 'react-chartjs-2';
import {
  Chart as ChartJS, LinearScale, PointElement, BubbleController, Tooltip, Legend
} from 'chart.js';
import { apiFetch } from '../../lib/api';
import { fmtN } from '../../lib/formatters';
import { PALETTE, baseFont, gridColor, tickColor } from '../../lib/chartDefaults';
import TabSkeleton from '../shared/Skeleton';
import ErrorBox from '../shared/ErrorBox';
import EmptyState from '../shared/EmptyState';
import RankNum from '../shared/RankNum';
import DataTable from '../shared/DataTable';
import WordCloudCanvas from './WordCloud';
import InfoCard from '../shared/InfoCard';

ChartJS.register(LinearScale, PointElement, BubbleController, Tooltip, Legend);

export default function Q2Tab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/q2/ranking-temas')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TabSkeleton stats={0} />;
  if (error) return <ErrorBox message={error} />;

  if (!data.length) {
    return (
      <>
        <p className="section-title">Principais eixos de atuação legislativa</p>
        <EmptyState hint="Nenhum tema legislativo foi retornado." />
      </>
    );
  }

  const maxProp = Math.max(...data.map(d => d.num_proposicoes));
  const lider = data[0];
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
        title: { display: true, text: 'Nº de deputados', color: tickColor, font: baseFont },
        grid: { color: gridColor },
        ticks: { color: tickColor, font: baseFont },
      },
      y: {
        title: { display: true, text: 'Nº de proposições', color: tickColor, font: baseFont },
        grid: { color: gridColor },
        ticks: { color: tickColor, font: baseFont, callback: v => fmtN(v) },
      }
    }
  };

  const columns = [
    { key: 'rank', header: '#', render: (_, i) => <RankNum rank={i + 1} /> },
    { key: 'tema', header: 'Tema', sortable: true, sortValue: d => d.tema },
    { key: 'num_proposicoes', header: 'Proposições', align: 'right', sortable: true, sortValue: d => d.num_proposicoes, render: d => fmtN(d.num_proposicoes) },
    { key: 'num_deputados', header: 'Deputados', align: 'right', sortable: true, sortValue: d => d.num_deputados, render: d => fmtN(d.num_deputados) },
  ];

  return (
    <>
      <p className="section-title">Principais eixos de atuação legislativa</p>
      <p className="section-subtitle">Proposições classificadas por tema da Câmara · Período 2023–2026</p>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Nuvem de palavras — eixos de atuação (tamanho ∝ nº de proposições)</h3>
        <WordCloudCanvas data={data} />
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Proposições × deputados (tamanho da bolha ∝ nº de proposições)</h3>
        <div className="chart-wrap-tall">
          <Bubble
            data={bubbleData}
            options={bubbleOpts}
            role="img"
            aria-label={`Dispersão de proposições por deputados envolvidos, ${fmtN(data.length)} temas. Maior tema: ${lider.tema}, ${fmtN(lider.num_proposicoes)} proposições e ${fmtN(lider.num_deputados)} deputados.`}
          />
        </div>
      </div>

      <div className="card">
        <h3>Tabela de temas</h3>
        <DataTable
          columns={columns}
          rows={data}
          rowKey={d => d.tema}
          search={{ placeholder: 'Buscar tema…', accessor: d => d.tema }}
        />
      </div>

      <InfoCard>
        <p>Proposições legislativas classificadas por tema conforme o <strong>sistema de temas legislativos da Câmara dos Deputados</strong>. O número de proposições e de deputados envolvidos por tema foi apurado cruzando as tabelas <code>autoria</code> e <code>classificacao</code>.</p>
        <p><strong>Termos técnicos:</strong></p>
        <ul>
          <li><strong>Proposição</strong>: qualquer proposta legislativa formal — PL (Projeto de Lei), PLP (Projeto de Lei Complementar), PEC (Proposta de Emenda Constitucional), PDC (Projeto de Decreto Legislativo), entre outras.</li>
          <li><strong>Tema legislativo</strong>: categoria temática atribuída pela Câmara (ex.: "Saúde", "Tributação", "Segurança Pública"). Uma proposição pode estar associada a mais de um tema.</li>
          <li><strong>Deputados envolvidos</strong>: número de parlamentares distintos que assinaram ao menos uma proposição classificada no tema — como autor principal ou coautor.</li>
        </ul>
        <p><strong>Fórmula:</strong> <code>num_proposicoes(tema) = COUNT(proposições classificadas no tema)</code>. O tamanho de cada palavra na nuvem e de cada bolha no gráfico é diretamente proporcional a esse contador.</p>
        <p><strong>Exemplo ilustrativo:</strong> se "Saúde" tem 320 proposições e "Esporte" tem 40, a palavra "Saúde" aparece com tamanho de fonte e bolha aproximadamente 8 vezes maior, pois <code>320 / 40 = 8</code>.</p>
      </InfoCard>
    </>
  );
}
