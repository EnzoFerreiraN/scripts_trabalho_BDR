import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend
} from 'chart.js';
import { apiFetch } from '../../lib/api';
import { fmt, fmtN } from '../../lib/formatters';
import { hBarData, hBarOptions } from '../../lib/chartDefaults';
import TabSkeleton from '../shared/Skeleton';
import ErrorBox from '../shared/ErrorBox';
import EmptyState from '../shared/EmptyState';
import RankNum from '../shared/RankNum';
import Badge from '../shared/Badge';
import DataTable from '../shared/DataTable';
import InfoCard from '../shared/InfoCard';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Q5Tab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/q5/fornecedores?limit=100')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TabSkeleton stats={3} charts={1} />;
  if (error) return <ErrorBox message={error} />;

  if (!data.length) {
    return (
      <>
        <p className="section-title">Principais fornecedores da CEAP</p>
        <EmptyState hint="Nenhum fornecedor foi retornado para o período." />
      </>
    );
  }

  const total = data.reduce((s, d) => s + d.total_recebido, 0);
  const top20 = data.slice(0, 20);

  const barData = hBarData(top20.map(d => d.fornecedor.slice(0, 30)), top20.map(d => d.total_recebido));
  const barOpts = hBarOptions(fmt);

  const columns = [
    { key: 'rank', header: '#', render: (_, i) => <RankNum rank={i + 1} /> },
    {
      key: 'fornecedor', header: 'Fornecedor', sortable: true, sortValue: d => d.fornecedor,
      cellStyle: { maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      render: d => d.fornecedor,
    },
    { key: 'categoria', header: 'Categoria', sortable: true, sortValue: d => d.categoria || '', render: d => <Badge variant="yellow">{d.categoria || '—'}</Badge> },
    { key: 'num_transacoes', header: 'Transações', align: 'right', sortable: true, sortValue: d => d.num_transacoes, render: d => fmtN(d.num_transacoes) },
    { key: 'num_deputados', header: 'Deputados', align: 'right', sortable: true, sortValue: d => d.num_deputados, render: d => fmtN(d.num_deputados) },
    { key: 'total_recebido', header: 'Total recebido', align: 'right', bold: true, sortable: true, sortValue: d => d.total_recebido, render: d => fmt(d.total_recebido) },
    { key: 'ticket_medio', header: 'Ticket médio', align: 'right', sortable: true, sortValue: d => d.ticket_medio, render: d => fmt(d.ticket_medio) },
  ];

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
        <div className="chart-wrap-tall">
          <Bar data={barData} options={barOpts}
            role="img"
            aria-label={`Top 20 fornecedores da CEAP por total recebido. Maior: ${data[0].fornecedor}, ${fmt(data[0].total_recebido)}.`} />
        </div>
      </div>

      <div className="card">
        <h3>Lista de fornecedores</h3>
        <DataTable
          columns={columns}
          rows={data}
          rowKey={(d, i) => d.fornecedor + i}
          search={{ placeholder: 'Buscar fornecedor ou categoria…', accessor: d => `${d.fornecedor} ${d.categoria || ''}` }}
        />
      </div>

      <InfoCard>
        <p>Ranking dos maiores recebedores de recursos da CEAP no período 2023–2026. Cada fornecedor é identificado pelo <strong>CNPJ ou CPF</strong> cadastrado nas notas fiscais emitidas pelos deputados.</p>
        <p><strong>Termos técnicos:</strong></p>
        <ul>
          <li><strong>Fornecedor</strong>: empresa (CNPJ) ou pessoa física (CPF) que recebeu pagamento via CEAP — companhia aérea, gráfica, posto de combustível, escritório de consultoria, etc. Um mesmo CNPJ pode ter atendido vários deputados de partidos e UFs diferentes, e aparece uma única vez no ranking consolidado.</li>
          <li><strong><code>total_recebido</code></strong>: <code>SOMA(vlrLiquido)</code> de todas as notas emitidas para o fornecedor no período.</li>
          <li><strong>Ticket médio</strong>: <code>total_recebido / nº_de_transações</code> — valor médio por nota fiscal.</li>
          <li><strong>Categoria</strong>: tipo de despesa predominante das notas associadas ao fornecedor, conforme a classificação da Câmara.</li>
        </ul>
        <p><strong>Exemplo ilustrativo</strong> — fornecedor com 30 notas no período:</p>
        <ol>
          <li>Total recebido: <code>R$ 90.000</code></li>
          <li>Ticket médio: <code>90.000 / 30 = R$ 3.000</code> por transação</li>
          <li>Se esse CNPJ atendeu 15 deputados distintos, ainda assim ocupa uma única posição no ranking, com o total consolidado.</li>
        </ol>
      </InfoCard>
    </>
  );
}
