import { useState, useEffect } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale,
  Tooltip, Legend
} from 'chart.js';
import { apiFetch } from '../../lib/api';
import { fmtN, pct } from '../../lib/formatters';
import { PALETTE, baseFont, gridColor, tickColor, legendColor } from '../../lib/chartDefaults';
import TabSkeleton from '../shared/Skeleton';
import ErrorBox from '../shared/ErrorBox';
import EmptyState from '../shared/EmptyState';
import DataTable from '../shared/DataTable';
import InfoCard from '../shared/InfoCard';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Q4Tab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/q4/escolaridade')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TabSkeleton stats={0} />;
  if (error) return <ErrorBox message={error} />;

  if (!data.length) {
    return (
      <>
        <p className="section-title">Escolaridade dos deputados</p>
        <EmptyState hint="Nenhum dado de escolaridade foi retornado." />
      </>
    );
  }

  const labels = data.map(d => d.escolaridade);
  const vals   = data.map(d => d.num_deputados);
  const colors = data.map((_, i) => PALETTE[i % PALETTE.length]);

  const pieData = { labels, datasets: [{ data: vals, backgroundColor: colors, borderWidth: 0 }] };
  const pieOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'right', labels: { color: legendColor, font: baseFont, boxWidth: 12 } } }
  };

  const barData = { labels, datasets: [{ data: vals, backgroundColor: colors, borderRadius: 6 }] };
  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: tickColor, font: baseFont } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor, font: baseFont } }
    }
  };

  const columns = [
    { key: 'escolaridade', header: 'Escolaridade', sortable: true, sortValue: d => d.escolaridade },
    { key: 'num_deputados', header: 'Deputados', align: 'right', sortable: true, sortValue: d => d.num_deputados, render: d => fmtN(d.num_deputados) },
    { key: 'pct', header: '%', align: 'right', sortable: true, sortValue: d => d.pct, render: d => pct(d.pct) },
  ];

  return (
    <>
      <p className="section-title">Escolaridade dos deputados</p>
      <p className="section-subtitle">Distribuição por nível de escolaridade declarado · Legislatura 2023–2026</p>

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <h3>Distribuição por escolaridade</h3>
          <div className="chart-wrap">
            <Doughnut data={pieData} options={pieOpts}
              role="img"
              aria-label={`Distribuição dos deputados por escolaridade declarada: ${data.map(d => `${d.escolaridade} ${fmtN(d.num_deputados)}`).join(', ')}.`} />
          </div>
        </div>
        <div className="card">
          <h3>Deputados por nível</h3>
          <div className="chart-wrap">
            <Bar data={barData} options={barOpts}
              role="img"
              aria-label={`Número de deputados por nível de escolaridade. Maior grupo: ${data.reduce((m, d) => d.num_deputados > m.num_deputados ? d : m, data[0]).escolaridade}.`} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Tabela de escolaridade</h3>
        <DataTable columns={columns} rows={data} rowKey={d => d.escolaridade} />
      </div>

      <InfoCard>
        <p>Escolaridade <strong>declarada pelo próprio parlamentar</strong> no cadastro oficial da Câmara dos Deputados. Os dados refletem as informações prestadas no momento do registro.</p>
        <p><strong>Atenção:</strong> não há verificação independente da escolaridade informada — o dado é autorreferido.</p>
        <p>Os 17 valores brutos do sistema foram <strong>consolidados em 5 níveis ordinais</strong> pelo critério do maior nível <em>concluído</em> — cursos incompletos contam como o nível anterior. Veja o agrupamento:</p>
        <ul>
          <li><strong>Sem informação</strong> — cadastro sem escolaridade registrada</li>
          <li><strong>Fundamental</strong> — <code>Primário</code> · <code>Primário Incompleto</code> · <code>Ginasial</code> · <code>Ensino Fundamental</code> · <code>Ensino Fundamental Incompleto</code></li>
          <li><strong>Médio</strong> — <code>Secundário</code> · <code>Secundário Incompleto</code> · <code>Ensino Médio</code> · <code>Ensino Médio Incompleto</code> · <code>Ensino Técnico</code> · <code>Superior Incompleto</code></li>
          <li><strong>Superior</strong> — <code>Superior</code> · <code>Mestrado Incompleto</code> · <code>Doutorado Incompleto</code></li>
          <li><strong>Pós-graduação</strong> — <code>Pós-Graduação</code> · <code>Mestrado</code> · <code>Doutorado</code></li>
        </ul>
        <p><strong>Fórmula do percentual na tabela:</strong> <code>% = 100 × num_deputados_no_nível / total_de_deputados</code>.</p>
        <p><strong>Nota:</strong> o nível "Sem informação" <strong>está incluído</strong> nesta contagem geral. Na análise de correlação com comportamento parlamentar (aba Q6), ele é <strong>excluído</strong> para não distorcer as médias de grupo.</p>
      </InfoCard>
    </>
  );
}
