import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend
} from 'chart.js';
import { apiFetch } from '../../lib/api';
import { fmt, fmtN, shortName } from '../../lib/formatters';
import { PALETTE, hBarData, hBarOptions, baseFont, gridColor, tickColor } from '../../lib/chartDefaults';
import TabSkeleton from '../shared/Skeleton';
import ErrorBox from '../shared/ErrorBox';
import EmptyState from '../shared/EmptyState';
import Avatar from '../shared/Avatar';
import Badge from '../shared/Badge';
import RankNum from '../shared/RankNum';
import DataTable from '../shared/DataTable';
import DeputadoCard from './DeputadoCard';
import GastoDetalhePanel from './GastoDetalhePanel';
import DeputadoSearch from '../Q3/DeputadoSearch';
import InfoCard from '../shared/InfoCard';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Q1Tab() {
  const [data, setData] = useState([]);
  const [deputados, setDeputados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDep, setSelectedDep] = useState(null);
  const [searchDep, setSearchDep] = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/q1/gastos-deputados?limit=100'),
      apiFetch('/q1/deputados'),
    ])
      .then(([rank, deps]) => { setData(rank); setDeputados(deps); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TabSkeleton />;
  if (error) return <ErrorBox message={error} />;

  if (!data.length) {
    return (
      <>
        <p className="section-title">Deputados com mais gastos</p>
        <EmptyState hint="Nenhum gasto da CEAP foi retornado para o período." />
      </>
    );
  }

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
      x: { grid: { display: false }, ticks: { color: tickColor, font: baseFont } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor, font: baseFont, callback: v => fmt(v) } }
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
    { key: 'num_transacoes', header: 'Transações', align: 'right', sortable: true, sortValue: d => d.num_transacoes, render: d => fmtN(d.num_transacoes) },
    { key: 'total_gasto', header: 'Total gasto', align: 'right', bold: true, sortable: true, sortValue: d => d.total_gasto, render: d => fmt(d.total_gasto) },
  ];

  return (
    <>
      <p className="section-title">Deputados com mais gastos</p>
      <p className="section-subtitle">Gastos da CEAP por parlamentar · Período 2023–2026</p>

      <div className="controls-section">
        <p className="controls-label">Consultar qualquer deputado</p>
        <div className="controls">
          <DeputadoSearch
            deputados={deputados}
            value={searchDep}
            onChange={setSearchDep}
          />
          <button
            onClick={() => { if (searchDep) setSelectedDep(searchDep); }}
            disabled={!searchDep}
          >
            Ver gastos
          </button>
        </div>
      </div>

      {selectedDep && (
        <GastoDetalhePanel
          dep={selectedDep}
          onClear={() => { setSelectedDep(null); setSearchDep(null); }}
        />
      )}

      <div className="stat-row">
        <div className="stat">
          <div className="val">{fmtN(deputados.length || data.length)}</div>
          <div className="lbl">Deputados com gastos</div>
        </div>
        <div className="stat">
          <div className="val">{fmt(total)}</div>
          <div className="lbl">Total gasto (top 100)</div>
        </div>
        <div className="stat">
          <div className="val">{fmt(total / data.length)}</div>
          <div className="lbl">Média por deputado (top 100)</div>
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
          <div className="chart-wrap-tall">
            <Bar data={barData} options={barOpts}
              role="img"
              aria-label={`Top 20 deputados por total gasto na CEAP. Maior: ${data[0].nome}, ${fmt(data[0].total_gasto)}.`} />
          </div>
        </div>
        <div className="card">
          <h3>Distribuição por partido (top 50)</h3>
          <div className="chart-wrap-tall">
            <Bar data={partidoData} options={partidoOpts}
              role="img"
              aria-label={`Gasto agregado por partido entre os 50 maiores. Maior: ${sorted[0][0]}, ${fmt(sorted[0][1])}.`} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Top 100 por gasto</h3>
        <DataTable
          columns={columns}
          rows={data}
          rowKey={d => d.id}
          onRowClick={setSelectedDep}
          rowTitle="Ver detalhes de gastos"
          search={{ placeholder: 'Filtrar os 100 maiores por nome, partido ou UF…', accessor: d => `${d.nome} ${d.partido} ${d.uf}` }}
        />
      </div>

      <InfoCard>
        <p>Dados da <strong>CEAP (Cota para Exercício da Atividade Parlamentar)</strong> referentes ao período 2023–2026. Cada registro corresponde a uma nota fiscal de reembolso emitida pelo deputado.</p>
        <p>O ranking exibe os <strong>100 maiores gastadores</strong>. O <strong>total gasto</strong> é a soma de todos os valores líquidos (<code>vlrLiquido</code>) por parlamentar. Clique em qualquer deputado — nos cards ou na tabela — para ver o detalhamento por categoria de gasto.</p>
        <p>Use a <strong>busca no topo</strong> para consultar o gasto de <em>qualquer</em> deputado, independentemente de estar no ranking.</p>
        <p><strong>Termos técnicos:</strong></p>
        <ul>
          <li><strong>CEAP</strong>: Cota para Exercício da Atividade Parlamentar — verba mensal de reembolso paga a cada deputado para cobrir despesas relacionadas ao mandato (passagens, hospedagem, divulgação, combustível, etc.).</li>
          <li><strong><code>vlrLiquido</code></strong>: valor líquido da nota fiscal após descontar eventuais estornos ou glosas. É o campo somado em todas as agregações desta análise.</li>
          <li><strong>Categoria</strong>: classificação da despesa atribuída pela Câmara (ex.: "Passagem aérea", "Divulgação da atividade parlamentar", "Combustíveis e lubrificantes").</li>
        </ul>
        <p><strong>Fórmulas:</strong> <code>total_gasto = SOMA(vlrLiquido)</code> por deputado. No detalhamento por categoria: <code>média = total_da_categoria / nº_de_transações_da_categoria</code>.</p>
        <p><strong>Exemplo ilustrativo</strong> — deputado com 3 notas:</p>
        <ol>
          <li>Passagem aérea: <code>R$ 4.000</code></li>
          <li>Combustível: <code>R$ 1.200</code></li>
          <li>Combustível: <code>R$ 800</code></li>
          <li>Total gasto: <code>4.000 + 1.200 + 800 = R$ 6.000</code></li>
          <li>Categoria "Combustíveis": <code>(1.200 + 800) / 2 transações = R$ 1.000</code> de média.</li>
        </ol>
      </InfoCard>

    </>
  );
}
