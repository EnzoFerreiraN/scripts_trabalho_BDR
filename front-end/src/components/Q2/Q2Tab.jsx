import { useState, useEffect, useMemo } from 'react';
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
import WordCloudEmentas from './WordCloudEmentas';
import InfoCard from '../shared/InfoCard';
import TemaDeputadosModal from './TemaDeputadosModal';

ChartJS.register(LinearScale, PointElement, BubbleController, Tooltip, Legend);

const temaTooltip = t =>
  `${t.tema} — ${fmtN(t.num_proposicoes)} proposições · ${fmtN(t.num_deputados)} deputados`;

export default function Q2Tab() {
  const [data, setData]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [selectedTema, setSelectedTema] = useState(null);
  const [cloudMode, setCloudMode]     = useState('temas'); // 'temas' | 'ementas'

  // Adapta os temas para o formato genérico da nuvem ({ texto, peso }).
  const wcItems = useMemo(
    () => data.map(d => ({ ...d, texto: d.tema, peso: d.num_proposicoes })),
    [data]
  );

  useEffect(() => {
    apiFetch('/q2/ranking-temas')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TabSkeleton stats={0} />;
  if (error)   return <ErrorBox message={error} />;

  if (!data.length) {
    return (
      <>
        <p className="section-title">Principais eixos de atuação legislativa</p>
        <EmptyState hint="Nenhum tema legislativo foi retornado." />
      </>
    );
  }

  const maxProp = Math.max(...data.map(d => d.num_proposicoes));
  const lider   = data[0];

  const bubbleData = {
    datasets: data.map((d, i) => ({
      label: d.tema,
      data: [{
        x: d.num_deputados,
        y: d.num_proposicoes,
        r: Math.round(4 + (d.num_proposicoes / maxProp) * 36),
      }],
      backgroundColor: PALETTE[i % PALETTE.length] + 'bb',
      borderColor:     PALETTE[i % PALETTE.length],
      borderWidth: 1,
    }))
  };

  const bubbleOpts = {
    responsive: true,
    maintainAspectRatio: false,
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
              ` Clique para ver os deputados`,
            ];
          }
        }
      }
    },
    onClick(evt, elements) {
      if (elements.length > 0) {
        setSelectedTema(data[elements[0].datasetIndex]);
      }
    },
    onHover(evt, elements) {
      evt.native.target.style.cursor = elements.length ? 'pointer' : 'default';
    },
    scales: {
      x: {
        title: { display: true, text: 'Nº de deputados', color: tickColor, font: baseFont },
        grid:  { color: gridColor },
        ticks: { color: tickColor, font: baseFont },
      },
      y: {
        title: { display: true, text: 'Nº de proposições', color: tickColor, font: baseFont },
        grid:  { color: gridColor },
        ticks: { color: tickColor, font: baseFont, callback: v => fmtN(v) },
      }
    }
  };

  const columns = [
    { key: 'rank',             header: '#',           render: (_, i) => <RankNum rank={i + 1} /> },
    { key: 'tema',             header: 'Tema',        sortable: true, sortValue: d => d.tema },
    { key: 'num_proposicoes',  header: 'Proposições', align: 'right', sortable: true, sortValue: d => d.num_proposicoes, render: d => fmtN(d.num_proposicoes) },
    { key: 'num_deputados',    header: 'Deputados',   align: 'right', sortable: true, sortValue: d => d.num_deputados,   render: d => fmtN(d.num_deputados) },
  ];

  return (
    <>
      <p className="section-title">Principais eixos de atuação legislativa</p>
      <p className="section-subtitle">Proposições classificadas por tema da Câmara · Período 2023–2026</p>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>
            {cloudMode === 'temas'
              ? 'Nuvem de temas — eixos de atuação (tamanho ∝ nº de proposições)'
              : 'Nuvem de palavras — texto das ementas (tamanho ∝ frequência da palavra)'}
          </h3>
          <div className="sub-nav" role="tablist" aria-label="Tipo de nuvem" style={{ margin: 0 }}>
            <button
              role="tab"
              className={cloudMode === 'temas' ? 'active' : ''}
              aria-selected={cloudMode === 'temas'}
              onClick={() => setCloudMode('temas')}
            >
              Temas
            </button>
            <button
              role="tab"
              className={cloudMode === 'ementas' ? 'active' : ''}
              aria-selected={cloudMode === 'ementas'}
              onClick={() => setCloudMode('ementas')}
            >
              Palavras das ementas
            </button>
          </div>
        </div>
        {cloudMode === 'temas' ? (
          <>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.35rem 0 0.5rem' }}>
              Clique numa palavra para ver os deputados do tema
            </p>
            <WordCloudCanvas
              items={wcItems}
              onWordClick={setSelectedTema}
              tooltipFormatter={temaTooltip}
              ariaLabel={`Nuvem dos eixos de atuação legislativa; tamanho proporcional ao nº de proposições. Maior tema: ${lider.tema}. Clique numa palavra para ver os deputados.`}
            />
          </>
        ) : (
          <>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.35rem 0 0.5rem' }}>
              Palavras mais frequentes extraídas do texto das ementas das proposições (após remoção de stopwords)
            </p>
            <WordCloudEmentas />
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Proposições × deputados (tamanho da bolha ∝ nº de proposições)</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
          Clique em uma bolha para ver os deputados do tema
        </p>
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
          rowKey={d => d.codTema}
          search={{ placeholder: 'Buscar tema…', accessor: d => d.tema }}
          onRowClick={setSelectedTema}
          rowTitle="Ver deputados deste tema"
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
        <p><strong>Fórmula:</strong> <code>num_proposicoes(tema) = COUNT(proposições classificadas no tema)</code>. O tamanho de cada palavra na nuvem e de cada bolha no gráfico é proporcional a esse contador (escala raiz quadrada, pois o olho percebe área e não altura da fonte).</p>
        <p><strong>Duas nuvens:</strong> a aba <em>Temas</em> mostra os eixos temáticos oficiais da Câmara ponderados pelo nº de proposições (nuvem de tags); a aba <em>Palavras das ementas</em> é uma nuvem de palavras clássica — o texto de todas as ementas é tokenizado, stopwords do português são removidas e cada palavra aparece com tamanho proporcional à sua frequência no corpus.</p>
        <p><strong>Interação:</strong> clique em qualquer bolha no gráfico, palavra na nuvem ou linha na tabela para ver os 15 deputados com mais proposições naquele tema.</p>
      </InfoCard>

      {selectedTema && (
        <TemaDeputadosModal
          tema={selectedTema}
          onClose={() => setSelectedTema(null)}
        />
      )}
    </>
  );
}
