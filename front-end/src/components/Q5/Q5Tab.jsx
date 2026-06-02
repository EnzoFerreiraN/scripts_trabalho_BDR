import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend
} from 'chart.js';
import { apiFetch } from '../../lib/api';
import { fmt, fmtN } from '../../lib/formatters';
import { hBarData, hBarOptions } from '../../lib/chartDefaults';
import LoadingSpinner from '../shared/LoadingSpinner';
import RankNum from '../shared/RankNum';
import Badge from '../shared/Badge';
import InfoCard from '../shared/InfoCard';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Q5Tab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/q5/fornecedores?limit=100')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data.length) return null;

  const total = data.reduce((s, d) => s + d.total_recebido, 0);
  const top20 = data.slice(0, 20);

  const barData = hBarData(top20.map(d => d.fornecedor.slice(0, 30)), top20.map(d => d.total_recebido));
  const barOpts = hBarOptions(fmt);

  return (
    <>
      <p className="section-title">Principais fornecedores da CEAP</p>
      <p className="section-subtitle">Empresas e pessoas que mais receberam reembolsos parlamentares · Período 2023–2026</p>

      <div className="stat-row">
        <div className="stat">
          <div className="val">{fmtN(data.length)}</div>
          <div className="lbl">Fornecedores únicos</div>
        </div>
        <div className="stat">
          <div className="val">{fmt(total)}</div>
          <div className="lbl">Total pago (top 100)</div>
        </div>
        <div className="stat">
          <div className="val">{fmt(data[0].total_recebido)}</div>
          <div className="lbl">Maior fornecedor</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Top 20 fornecedores por total recebido</h3>
        <div className="chart-wrap-tall"><Bar data={barData} options={barOpts} /></div>
      </div>

      <div className="card">
        <h3>Lista de fornecedores</h3>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>#</th><th>Fornecedor</th><th>Categoria</th>
              <th style={{ textAlign: 'right' }}>Transações</th>
              <th style={{ textAlign: 'right' }}>Deputados</th>
              <th style={{ textAlign: 'right' }}>Total recebido</th>
              <th style={{ textAlign: 'right' }}>Ticket médio</th>
            </tr></thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={d.fornecedor + i}>
                  <td><RankNum rank={i + 1} /></td>
                  <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.fornecedor}
                  </td>
                  <td><Badge variant="yellow">{d.categoria || '—'}</Badge></td>
                  <td style={{ textAlign: 'right' }}>{fmtN(d.num_transacoes)}</td>
                  <td style={{ textAlign: 'right' }}>{fmtN(d.num_deputados)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(d.total_recebido)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(d.ticket_medio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InfoCard>
        <p>Fornecedores identificados pelo <strong>CNPJ ou CPF</strong> nas notas fiscais da CEAP. O ranking é baseado no valor total recebido por empresa ou pessoa física no período analisado.</p>
        <p>Um mesmo fornecedor pode atender múltiplos deputados de partidos diferentes. O <strong>ticket médio</strong> é calculado dividindo o total recebido pelo número de transações registradas.</p>
      </InfoCard>
    </>
  );
}
