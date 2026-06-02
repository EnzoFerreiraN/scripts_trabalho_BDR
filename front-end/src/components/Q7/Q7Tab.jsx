import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend
} from 'chart.js';
import { apiFetch } from '../../lib/api';
import { fmtN, pct, shortName } from '../../lib/formatters';
import { hBarData, hBarOptions } from '../../lib/chartDefaults';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorBox from '../shared/ErrorBox';
import Avatar from '../shared/Avatar';
import Badge from '../shared/Badge';
import RankNum from '../shared/RankNum';
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
      .catch(e => setError('Erro ao carregar: ' + e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox message={error} />;
  if (!data.length) return null;

  const top20 = data.slice(0, 20);
  const nameLabel = d => shortName(d.nome).split(' ').slice(0, 2).join(' ');

  const infData = hBarData(top20.map(nameLabel), top20.map(d => d.pct_influencia));
  const infOpts = hBarOptions(v => pct(v));

  const aprovData = hBarData(top20.map(nameLabel), top20.map(d => d.taxa_aprovacao));
  const aprovOpts = hBarOptions(v => pct(v));

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
          <div className="chart-wrap-tall"><Bar data={infData} options={infOpts} /></div>
        </div>
        <div className="card">
          <h3>Taxa de aprovação (top 20)</h3>
          <div className="chart-wrap-tall"><Bar data={aprovData} options={aprovOpts} /></div>
        </div>
      </div>

      <div className="card">
        <h3>Ranking de influência</h3>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>#</th><th>Deputado</th><th>Partido</th><th>UF</th>
              <th style={{ textAlign: 'right' }}>Em pauta</th>
              <th style={{ textAlign: 'right' }}>Aprovadas</th>
              <th style={{ textAlign: 'right' }}>Taxa aprov.</th>
              <th style={{ textAlign: 'right' }}>% Influência</th>
            </tr></thead>
            <tbody>
              {data.map((dep, i) => (
                <tr key={dep.nome + i}>
                  <td><RankNum rank={i + 1} /></td>
                  <td>
                    <div className="td-deputy">
                      <Avatar urlFoto={dep.urlFoto} nome={dep.nome} size="sm" />
                      <span className="td-deputy-name">{dep.nome}</span>
                    </div>
                  </td>
                  <td><Badge variant="blue">{dep.partido}</Badge></td>
                  <td>{dep.uf}</td>
                  <td style={{ textAlign: 'right' }}>{fmtN(dep.em_pauta_plen)}</td>
                  <td style={{ textAlign: 'right' }}>{fmtN(dep.aprovadas_pelo_dep)}</td>
                  <td style={{ textAlign: 'right' }}>{pct(dep.taxa_aprovacao)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{pct(dep.pct_influencia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InfoCard>
        <p>O <strong>índice de influência</strong> é calculado como a proporção de proposições de autoria do deputado que foram aprovadas no plenário, em relação ao total de proposições em pauta no mesmo período.</p>
        <p><strong>% influência</strong> = (proposições aprovadas do deputado ÷ total de proposições em pauta) × 100. A <strong>taxa de aprovação</strong> indica quantas das propostas do deputado, entre as que chegaram à votação, foram aprovadas.</p>
      </InfoCard>
    </>
  );
}
