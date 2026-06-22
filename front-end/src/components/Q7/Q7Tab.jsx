import { useState, useEffect } from 'react';
import { Bar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement, CategoryScale, LinearScale,
  ScatterController, PointElement,
  Tooltip, Legend
} from 'chart.js';
import { apiFetch } from '../../lib/api';
import { fmtN, pct, shortName } from '../../lib/formatters';
import { PALETTE, hBarData, hBarOptions, baseFont, gridColor, tickColor, legendColor } from '../../lib/chartDefaults';
import TabSkeleton from '../shared/Skeleton';
import ErrorBox from '../shared/ErrorBox';
import EmptyState from '../shared/EmptyState';
import Avatar from '../shared/Avatar';
import Badge from '../shared/Badge';
import RankNum from '../shared/RankNum';
import DataTable from '../shared/DataTable';
import Podium from './Podium';
import InfoCard from '../shared/InfoCard';
import ProposicoesInfluenciaModal from './ProposicoesInfluenciaModal';

ChartJS.register(BarElement, CategoryScale, LinearScale, ScatterController, PointElement, Tooltip, Legend);

export default function Q7Tab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDep, setSelectedDep] = useState(null);

  useEffect(() => {
    apiFetch('/q7/influencia?limit=200')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TabSkeleton stats={3} />;
  if (error) return <ErrorBox message={error} />;

  if (!data.length) {
    return (
      <>
        <p className="section-title">Influência parlamentar</p>
        <EmptyState hint="Nenhum dado de influência foi retornado." />
      </>
    );
  }

  const top20 = data.slice(0, 20);
  const nameLabel = d => shortName(d.nome).split(' ').slice(0, 2).join(' ');

  // Bar chart: top 20 by pct_influencia
  const infData = hBarData(top20.map(nameLabel), top20.map(d => d.pct_influencia));
  const infOpts = hBarOptions(v => v.toFixed(1));

  // Scatter: volume (x=em_pauta) × aprovação (y=aprovadas), tamanho ∝ pct_influencia
  const scatterDataset = {
    label: 'Deputado',
    data: data.map(d => ({ x: d.em_pauta_plen, y: d.aprovadas_pelo_dep })),
    backgroundColor: data.map(d =>
      `rgba(79,70,229,${(0.25 + (d.pct_influencia / 100) * 0.65).toFixed(2)})`
    ),
    borderColor: data.map(d =>
      d.pct_influencia > 80 ? '#4f46e5' : 'transparent'
    ),
    borderWidth: 1,
    pointRadius: data.map(d => 4 + (d.pct_influencia / 100) * 9),
    pointHoverRadius: data.map(d => 5 + (d.pct_influencia / 100) * 10),
  };
  const scatterOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => {
            const d = data[ctx.dataIndex];
            return [
              d.nome,
              `${d.aprovadas_pelo_dep} aprovadas de ${d.em_pauta_plen} em pauta`,
              `Score: ${d.score_ponderado.toFixed(1)}  |  Influência: ${d.pct_influencia.toFixed(1)}`,
            ];
          }
        }
      }
    },
    scales: {
      x: {
        title: { display: true, text: 'Propostas em pauta no plenário', color: tickColor, font: baseFont },
        grid: { color: gridColor },
        ticks: { color: tickColor, font: baseFont }
      },
      y: {
        title: { display: true, text: 'Aprovadas', color: tickColor, font: baseFont },
        grid: { color: gridColor },
        ticks: { color: tickColor, font: baseFont }
      }
    }
  };

  const columns = [
    { key: 'rank', header: '#', render: (_, i) => <RankNum rank={i + 1} /> },
    {
      key: 'nome', header: 'Deputado', sortable: true, sortValue: d => d.nome,
      render: d => (
        <div className="td-deputy">
          <Avatar urlFoto={d.urlFoto} nome={d.nome} size="sm" />
          <span className="td-deputy-name">{d.nome}</span>
        </div>
      )
    },
    { key: 'partido', header: 'Partido', sortable: true, sortValue: d => d.partido, render: d => <Badge variant="blue">{d.partido}</Badge> },
    { key: 'uf', header: 'UF', sortable: true, sortValue: d => d.uf },
    { key: 'em_pauta_plen', header: 'Em pauta', align: 'right', sortable: true, sortValue: d => d.em_pauta_plen, render: d => fmtN(d.em_pauta_plen) },
    { key: 'aprovadas_pelo_dep', header: 'Aprovadas', align: 'right', sortable: true, sortValue: d => d.aprovadas_pelo_dep, render: d => fmtN(d.aprovadas_pelo_dep) },
    { key: 'taxa_aprovacao', header: 'Taxa aprov.', align: 'right', sortable: true, sortValue: d => d.taxa_aprovacao, render: d => pct(d.taxa_aprovacao) },
    { key: 'score_ponderado', header: 'Score', align: 'right', sortable: true, sortValue: d => d.score_ponderado, render: d => d.score_ponderado.toFixed(1) },
    { key: 'pct_influencia', header: '% Influência', align: 'right', bold: true, sortable: true, sortValue: d => d.pct_influencia, render: d => d.pct_influencia.toFixed(1) },
  ];

  return (
    <>
      <p className="section-title">Influência parlamentar</p>
      <p className="section-subtitle">Deputados com maior impacto na aprovação de proposições no plenário · 2023–2026</p>

      <div className="stat-row">
        <div className="stat">
          <div className="val">{fmtN(data.length)}</div>
          <div className="lbl">Deputados analisados</div>
        </div>
        <div className="stat">
          <div className="val">{data[0].pct_influencia.toFixed(1)}</div>
          <div className="lbl">Maior índice de influência</div>
        </div>
        <div className="stat">
          <div className="val">{data[0].score_ponderado.toFixed(1)}</div>
          <div className="lbl">Maior score ponderado</div>
        </div>
        <div className="stat">
          <div className="val">{pct(data[0].taxa_aprovacao)}</div>
          <div className="lbl">Maior taxa de aprovação</div>
        </div>
      </div>

      <Podium data={data} />

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <h3>Volume vs. aprovação — todos os deputados</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
            Eixo x = propostas que chegaram ao plenário · Eixo y = aprovadas · Tamanho = índice de influência
          </p>
          <div className="chart-wrap-tall">
            <Scatter
              data={{ datasets: [scatterDataset] }}
              options={scatterOpts}
              role="img"
              aria-label={`Dispersão de deputados por volume de propostas em pauta (x) versus aprovadas (y). ${data[0].nome} lidera com score ${data[0].score_ponderado.toFixed(1)}.`}
            />
          </div>
        </div>
        <div className="card">
          <h3>Top 20 por índice de influência</h3>
          <div className="chart-wrap-tall">
            <Bar data={infData} options={infOpts}
              role="img"
              aria-label={`Top 20 deputados por índice de influência ponderado. Maior: ${data[0].nome}, ${data[0].pct_influencia.toFixed(1)}.`} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Ranking de influência</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '-0.25rem 0 0.5rem' }}>
          Clique em qualquer deputado para ver as proposições que compõem o score.
        </p>
        <DataTable
          columns={columns}
          rows={data}
          rowKey={(d, i) => d.nome + i}
          search={{ placeholder: 'Buscar por nome, partido ou UF…', accessor: d => `${d.nome} ${d.partido} ${d.uf}` }}
          initialSort={{ key: 'pct_influencia', dir: 'desc' }}
          onRowClick={setSelectedDep}
          rowTitle="Ver proposições do score"
        />
      </div>

      {selectedDep && (
        <ProposicoesInfluenciaModal dep={selectedDep} onClose={() => setSelectedDep(null)} />
      )}

      <InfoCard>
        <p>O <strong>índice de influência</strong> (0–100) mede o impacto real do deputado nas leis aprovadas no plenário. Ele valoriza quem foi <strong>autor principal</strong> de uma proposta — não apenas mais um coautor — e quem aprovou projetos com <strong>votação folgada</strong> (sinal de consenso mais amplo).</p>
        <p><strong>Termos técnicos:</strong></p>
        <ul>
          <li><strong>Votação folgada</strong>: aprovação com margem de consenso elevada — a proposição obteve muito mais votos favoráveis do que contrários (ex.: 400 Sim para 100 Não → margem <code>0,80</code>). Quanto mais folgada a votação, maior a contribuição para o score. Uma aprovação por 1 voto de diferença vale muito menos do que uma aprovação quase unânime.</li>
          <li><strong><code>ordemAssinatura</code></strong>: posição do deputado na lista de signatários da proposição. Valor <code>1</code> indica autor principal; valores maiores indicam coautores em ordem de adesão.</li>
          <li><strong>Proponente</strong>: deputado que formalmente apresentou a proposição ao plenário — tratado como autor principal para fins de peso.</li>
          <li><strong>Margem de aprovação</strong>: <code>votosSim / (votosSim + votosNão)</code> na votação nominal da proposição. Varia de 0 (rejeitada) a 1 (unânime). Abstenções e obstruções não entram no denominador.</li>
          <li><strong><code>votosSim</code> / <code>votosNão</code></strong>: contagem de votos favoráveis e contrários registrados na votação nominal da proposição.</li>
          <li><strong>Score ponderado</strong>: soma de <code>peso × margem</code> sobre todas as proposições aprovadas do deputado — captura tanto o protagonismo (peso) quanto o consenso gerado (margem).</li>
          <li><strong>Em pauta</strong>: total de proposições que o deputado levou ao plenário, aprovadas ou não. Serve de denominador para a taxa de conversão.</li>
          <li><strong>Taxa de conversão</strong>: <code>aprovadas / em_pauta</code> — mede a efetividade legislativa independentemente do volume de score.</li>
          <li><strong>Normalização</strong>: o score ponderado é dividido pelo maior score observado entre todos os deputados, colocando todos na mesma escala (0–1) antes de compor o índice final.</li>
        </ul>
        <p><strong>Como é calculado:</strong> para cada proposição aprovada, multiplica-se o <em>peso do papel</em> pela <em>margem de aprovação</em>:</p>
        <ul>
          <li><strong>Peso do papel</strong>: autor principal (<code>ordemAssinatura = 1</code> ou <code>proponente = 1</code>) → <code>1,0</code>; 2ª assinatura → <code>0,50</code>; 3ª → <code>0,33</code>; N-ésima → <code>1/N</code>.</li>
          <li><strong>Margem de aprovação</strong>: <code>votosSim / (votosSim + votosNão)</code> — quanto mais unânime, maior o valor.</li>
          <li>A soma desses produtos sobre todas as aprovadas forma o <strong>score</strong>. O índice final combina o score normalizado <strong>(70%)</strong> com a taxa de conversão aprovadas ÷ em pauta <strong>(30%)</strong>.</li>
        </ul>
        <p><strong>Exemplo de cálculo</strong> — deputado com 2 proposições aprovadas e 3 em pauta:</p>
        <ol>
          <li>Proposta A: autor principal (<code>peso = 1,0</code>), 400 sim / 100 não → margem <code>400/500 = 0,80</code> → contribuição <code>1,0 × 0,80 = 0,80</code></li>
          <li>Proposta B: 4ª assinatura (<code>peso = 0,25</code>), 300 sim / 200 não → margem <code>300/500 = 0,60</code> → contribuição <code>0,25 × 0,60 = 0,15</code></li>
          <li>Score ponderado = <code>0,80 + 0,15 = 0,95</code></li>
          <li>Taxa de conversão = <code>2 aprovadas / 3 em pauta ≈ 0,67</code></li>
          <li>Supondo que o maior score entre todos os deputados seja <code>41,6</code> (necessário para normalizar):<br />
            Score normalizado = <code>0,95 / 41,6 ≈ 0,023</code><br />
            Parcela do score: <code>0,7 × 0,023 ≈ 0,016</code><br />
            Parcela da conversão: <code>0,3 × 0,67 ≈ 0,201</code><br />
            Índice = <code>100 × (0,016 + 0,201) ≈ <strong>21,7</strong></code>
          </li>
        </ol>
      </InfoCard>
    </>
  );
}
