import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend
} from 'chart.js';
import { apiFetch } from '../../lib/api';
import { fmtN, pct, shortName } from '../../lib/formatters';
import { hBarData, hBarOptions } from '../../lib/chartDefaults';
import TabSkeleton from '../shared/Skeleton';
import ErrorBox from '../shared/ErrorBox';
import EmptyState from '../shared/EmptyState';
import Avatar from '../shared/Avatar';
import Badge from '../shared/Badge';
import RankNum from '../shared/RankNum';
import DataTable from '../shared/DataTable';
import Podium from './Podium';
import InfoCard from '../shared/InfoCard';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Q7Tab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/q7/influencia?limit=100')
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

  const infData = hBarData(top20.map(nameLabel), top20.map(d => d.pct_influencia));
  const infOpts = hBarOptions(v => pct(v));

  const aprovData = hBarData(top20.map(nameLabel), top20.map(d => d.taxa_aprovacao));
  const aprovOpts = hBarOptions(v => pct(v));

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
    { key: 'pct_influencia', header: '% Influência', align: 'right', bold: true, sortable: true, sortValue: d => d.pct_influencia, render: d => pct(d.pct_influencia) },
  ];

  return (
    <>
      <p className="section-title">Influência parlamentar</p>
      <p className="section-subtitle">Deputados com maior taxa de aprovação de suas proposições no plenário · Período 2023–2026</p>

      <div className="stat-row">
        <div className="stat">
          <div className="val">{fmtN(data.length)}</div>
          <div className="lbl">Deputados analisados</div>
        </div>
        <div className="stat">
          <div className="val">{pct(data[0].pct_influencia)}</div>
          <div className="lbl">Maior % influência</div>
        </div>
        <div className="stat">
          <div className="val">{pct(data[0].taxa_aprovacao)}</div>
          <div className="lbl">Maior taxa de aprovação</div>
        </div>
      </div>

      <Podium data={data} />

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <h3>Top 20 por % de influência</h3>
          <div className="chart-wrap-tall">
            <Bar data={infData} options={infOpts}
              role="img"
              aria-label={`Top 20 deputados por percentual de influência. Maior: ${data[0].nome}, ${pct(data[0].pct_influencia)}.`} />
          </div>
        </div>
        <div className="card">
          <h3>Taxa de aprovação (top 20)</h3>
          <div className="chart-wrap-tall">
            <Bar data={aprovData} options={aprovOpts}
              role="img"
              aria-label={`Taxa de aprovação das proposições dos 20 deputados mais influentes. Maior: ${data[0].nome}, ${pct(data[0].taxa_aprovacao)}.`} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Ranking de influência</h3>
        <DataTable
          columns={columns}
          rows={data}
          rowKey={(d, i) => d.nome + i}
          search={{ placeholder: 'Buscar por nome, partido ou UF…', accessor: d => `${d.nome} ${d.partido} ${d.uf}` }}
        />
      </div>

      <InfoCard>
        <p>O <strong>índice de influência</strong> é calculado como a proporção de proposições de autoria do deputado que foram aprovadas no plenário, em relação ao total de proposições em pauta no mesmo período.</p>
        <p><strong>% influência</strong> = (proposições aprovadas do deputado ÷ total de proposições em pauta) × 100. A <strong>taxa de aprovação</strong> indica quantas das propostas do deputado, entre as que chegaram à votação, foram aprovadas.</p>
      </InfoCard>
    </>
  );
}
