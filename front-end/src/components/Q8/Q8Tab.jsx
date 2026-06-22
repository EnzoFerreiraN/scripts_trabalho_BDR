import { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { apiFetch } from '../../lib/api';
import { fmt, fmtN, pct } from '../../lib/formatters';
import { PALETTE, VOTE_COLORS, legendColor, baseFont } from '../../lib/chartDefaults';
import TabSkeleton from '../shared/Skeleton';
import ErrorBox from '../shared/ErrorBox';
import EmptyState from '../shared/EmptyState';
import Avatar from '../shared/Avatar';
import Badge from '../shared/Badge';
import DataTable from '../shared/DataTable';
import InfoCard from '../shared/InfoCard';
import LoadingSpinner from '../shared/LoadingSpinner';
import DeputadoSearch from '../Q3/DeputadoSearch';
import WordCloudCanvas from '../Q2/WordCloud';

ChartJS.register(ArcElement, Tooltip, Legend);

function voteColor(v) { return VOTE_COLORS[v] || '#4f8ef7'; }

export default function Q8Tab() {
  const [deputados, setDeputados]   = useState([]);
  const [selectedDep, setSelectedDep] = useState(null);
  const [data, setData]             = useState(null);
  const [initLoading, setInitLoading] = useState(true);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  // Carrega lista de deputados para o autocomplete.
  useEffect(() => {
    apiFetch('/q8/deputados')
      .then(setDeputados)
      .catch(e => setError(e.message))
      .finally(() => setInitLoading(false));
  }, []);

  async function buscar() {
    if (!selectedDep) { setError('Selecione um deputado da lista.'); return; }
    setLoading(true); setError(null); setData(null);
    try {
      const d = await apiFetch(`/q8/visao-geral/${selectedDep.id}`);
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (initLoading) return <TabSkeleton />;

  // ── Gastos: doughnut das categorias ──────────────────────────────────────
  const top8cats = data ? data.gastos_categoria.slice(0, 8) : [];
  const gastosDonutData = top8cats.length ? {
    labels: top8cats.map(d => d.categoria),
    datasets: [{ data: top8cats.map(d => d.total), backgroundColor: PALETTE, borderWidth: 0 }],
  } : null;
  const gastosDonutOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: legendColor, font: { size: 10 }, boxWidth: 12 } },
      tooltip: { callbacks: { label: c => ' ' + fmt(c.raw) } },
    },
  };

  // ── Votos: agrega por tipo (todos os temas) para o doughnut ──────────────
  const votesAgg = {};
  (data?.votos_por_tema || []).forEach(v => {
    votesAgg[v.voto] = (votesAgg[v.voto] || 0) + v.num_votos;
  });
  const votesEntries = Object.entries(votesAgg).sort((a, b) => b[1] - a[1]);
  const votesTotalGeral = votesEntries.reduce((s, [, n]) => s + n, 0);
  const votesDonutData = votesEntries.length ? {
    labels: votesEntries.map(([v]) => v),
    datasets: [{
      data: votesEntries.map(([, n]) => n),
      backgroundColor: votesEntries.map(([v]) => voteColor(v)),
      borderWidth: 0,
    }],
  } : null;
  const votesDonutOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { color: legendColor, font: baseFont, boxWidth: 12 } },
    },
  };

  // ── Votos: pivot para uma linha por tema (voto predominante) ─────────────
  const temaMap = {};
  (data?.votos_por_tema || []).forEach(v => {
    if (!temaMap[v.tema]) temaMap[v.tema] = { tema: v.tema, total: 0, predominante: null, maxVotos: 0 };
    temaMap[v.tema].total += v.num_votos;
    if (v.num_votos > temaMap[v.tema].maxVotos) {
      temaMap[v.tema].maxVotos = v.num_votos;
      temaMap[v.tema].predominante = v.voto;
    }
  });
  const votosRows = Object.values(temaMap).sort((a, b) => b.total - a.total);

  const votosColumns = [
    { key: 'tema', header: 'Tema', sortable: true },
    {
      key: 'predominante',
      header: 'Voto predominante',
      render: d => d.predominante ? (
        <span className="badge" style={{
          background: voteColor(d.predominante) + '22',
          color: voteColor(d.predominante),
        }}>
          {d.predominante}
        </span>
      ) : '—',
    },
    {
      key: 'total', header: 'Votos', align: 'right',
      sortable: true, sortValue: d => d.total,
      render: d => fmtN(d.total),
    },
  ];

  // ── Fornecedores: colunas da DataTable ───────────────────────────────────
  const fornCols = [
    { key: 'fornecedor', header: 'Fornecedor', sortable: true },
    {
      key: 'num_transacoes', header: 'Transações', align: 'right',
      sortable: true, render: d => fmtN(d.num_transacoes),
    },
    {
      key: 'total_recebido', header: 'Total', align: 'right',
      sortable: true, render: d => fmt(d.total_recebido),
    },
  ];

  return (
    <>
      <p className="section-title">Visão Geral do Deputado</p>
      <p className="section-subtitle">
        Selecione um parlamentar para ver um resumo consolidado de gastos, atuação, votos e influência · Legislatura 2023–2026
      </p>

      {/* ── SELEÇÃO DE DEPUTADO ─────────────────────────────────────────── */}
      <div className="controls">
        <DeputadoSearch deputados={deputados} value={selectedDep} onChange={setSelectedDep} />
        <button
          onClick={buscar}
          disabled={loading || !selectedDep}
          style={{ opacity: (!loading && !selectedDep) ? 0.5 : 1 }}
        >
          {loading ? 'Carregando…' : 'Ver visão geral'}
        </button>
      </div>

      {error && <ErrorBox message={error} />}
      {loading && <LoadingSpinner text="Carregando visão geral…" />}

      {!loading && !error && !data && (
        <EmptyState
          title="Nenhum deputado selecionado"
          hint="Busque um deputado pelo nome e clique em 'Ver visão geral'."
        />
      )}

      {data && (
        <>
          {/* ── HERO ──────────────────────────────────────────────────── */}
          <div className="detail-hero">
            <Avatar urlFoto={data.urlFoto} nome={data.nome} size="lg" />
            <div className="detail-hero-info">
              <div className="dep-name">{data.nome}</div>
              <div className="dep-meta">
                {data.partido && <Badge variant="blue">{data.partido}</Badge>}
                {data.uf      && <Badge variant="gray" style={{ marginLeft: '0.3rem' }}>{data.uf}</Badge>}
                <Badge variant="gray" style={{ marginLeft: '0.3rem' }}>{data.escolaridade}</Badge>
              </div>
              <div className="dep-total">
                Total CEAP: <strong>{fmt(data.total_gasto)}</strong> · {fmtN(data.num_transacoes)} transações
              </div>
            </div>
          </div>

          {/* ── GASTOS POR CATEGORIA ──────────────────────────────────── */}
          {data.gastos_categoria.length > 0 && (
            <>
              <p className="section-title" style={{ marginTop: '2rem' }}>Gastos (CEAP)</p>
              <div className="grid-2">
                <div className="card">
                  <h3>Distribuição por categoria</h3>
                  <div className="chart-wrap">
                    <Doughnut
                      data={gastosDonutData}
                      options={gastosDonutOpts}
                      role="img"
                      aria-label={`Distribuição dos gastos de ${data.nome} por categoria. Maior: ${top8cats[0]?.categoria}, ${fmt(top8cats[0]?.total)}.`}
                    />
                  </div>
                </div>
                <div className="card" style={{ overflow: 'hidden' }}>
                  <h3>Por categoria</h3>
                  <div className="table-wrap" style={{ maxHeight: '280px' }}>
                    <table>
                      <thead><tr>
                        <th>Categoria</th>
                        <th style={{ textAlign: 'right' }}>Transações</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                        <th style={{ textAlign: 'right' }}>Média</th>
                      </tr></thead>
                      <tbody>
                        {data.gastos_categoria.map(d => (
                          <tr key={d.categoria}>
                            <td style={{ fontSize: '0.78rem', whiteSpace: 'normal', lineHeight: '1.2' }}>{d.categoria}</td>
                            <td style={{ textAlign: 'right' }}>{fmtN(d.num_transacoes)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(d.total)}</td>
                            <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{fmt(d.media)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── PRINCIPAIS FORNECEDORES ───────────────────────────────── */}
          {data.fornecedores.length > 0 && (
            <>
              <p className="section-title" style={{ marginTop: '2rem' }}>Principais fornecedores</p>
              <div className="card">
                <DataTable
                  columns={fornCols}
                  rows={data.fornecedores}
                  rowKey={d => `${d.fornecedor}-${d.cnpj_cpf ?? ''}`}
                />
              </div>
            </>
          )}

          {/* ── EIXOS DE ATUAÇÃO (nuvens) ─────────────────────────────── */}
          {(data.temas_nuvem.length > 0 || data.palavras_ementas.length > 0) && (
            <>
              <p className="section-title" style={{ marginTop: '2rem' }}>Eixos de atuação</p>
              <div className="grid-2">
                {data.temas_nuvem.length > 0 && (
                  <div className="card">
                    <h3>Temas legislativos</h3>
                    <WordCloudCanvas
                      items={data.temas_nuvem.map(t => ({ texto: t.tema, peso: t.num_proposicoes }))}
                      tooltipFormatter={item => `${item.texto}: ${fmtN(item.peso)} proposição(ões)`}
                      ariaLabel={`Nuvem de temas legislativos de ${data.nome}`}
                    />
                  </div>
                )}
                {data.palavras_ementas.length > 0 && (
                  <div className="card">
                    <h3>Palavras das ementas</h3>
                    <WordCloudCanvas
                      items={data.palavras_ementas.map(p => ({ texto: p.palavra, peso: p.frequencia }))}
                      tooltipFormatter={item => `${item.texto}: ${fmtN(item.peso)} ocorrência(s)`}
                      ariaLabel={`Nuvem de palavras das ementas de ${data.nome}`}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── PADRÃO DE VOTAÇÃO ─────────────────────────────────────── */}
          {data.votos_por_tema.length > 0 && (
            <>
              <p className="section-title" style={{ marginTop: '2rem' }}>Padrão de votação</p>
              <div className="grid-2">
                <div className="card">
                  <h3>Distribuição geral de votos</h3>
                  <div className="dep-sub" style={{ marginBottom: '0.5rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                    {fmtN(votesTotalGeral)} votos em {fmtN(votosRows.length)} temas
                  </div>
                  {votesDonutData && (
                    <div className="chart-wrap">
                      <Doughnut
                        data={votesDonutData}
                        options={votesDonutOpts}
                        role="img"
                        aria-label={`Distribuição de votos de ${data.nome}: ${votesEntries.map(([v, n]) => `${v} ${fmtN(n)}`).join(', ')}.`}
                      />
                    </div>
                  )}
                </div>
                <div className="card">
                  <h3>Voto predominante por tema</h3>
                  <DataTable
                    columns={votosColumns}
                    rows={votosRows}
                    rowKey={d => d.tema}
                    search={{ placeholder: 'Filtrar tema…', accessor: d => d.tema }}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── INFLUÊNCIA PARLAMENTAR ────────────────────────────────── */}
          <p className="section-title" style={{ marginTop: '2rem' }}>Influência parlamentar</p>
          {data.influencia ? (
            <div className="grid-2">
              <div className="card">
                <h3>Score de influência</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Score ponderado</span>
                    <span style={{ fontWeight: 700, fontSize: '1.5rem' }}>
                      {data.influencia.score_ponderado.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Influência relativa</span>
                    <span style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--accent, #2563eb)' }}>
                      {pct(data.influencia.pct_influencia)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="card">
                <h3>Proposições em plenário</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Em pauta no plenário</span>
                    <span style={{ fontWeight: 600 }}>{fmtN(data.influencia.em_pauta_plen)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Aprovadas</span>
                    <span style={{ fontWeight: 600 }}>{fmtN(data.influencia.aprovadas_pelo_dep)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Taxa de aprovação</span>
                    <span style={{ fontWeight: 600 }}>{pct(data.influencia.taxa_aprovacao)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ color: 'var(--muted)', fontSize: '0.88rem', padding: '1rem 1.25rem' }}>
              Este deputado não possui proposições aprovadas no plenário no período analisado — sem dados de influência.
            </div>
          )}

          {/* ── METODOLOGIA ───────────────────────────────────────────── */}
          <InfoCard title="Metodologia & notas">
            <p><strong>Gastos (CEAP):</strong> registros da Cota para o Exercício da Atividade Parlamentar agregados por categoria de despesa. Exibidas as 10 maiores categorias do parlamentar.</p>
            <p><strong>Fornecedores:</strong> empresas ou pessoas físicas com maior volume total recebido do parlamentar via CEAP (top 10).</p>
            <p><strong>Temas legislativos:</strong> eixos temáticos oficiais da Câmara (ex.: Saúde, Tributação, Segurança Pública) ponderados pelo número de proposições de autoria do deputado classificadas em cada tema. Tamanho proporcional a √(num_proposicoes).</p>
            <p><strong>Palavras das ementas:</strong> termos mais frequentes nas ementas das proposições deste parlamentar, após tokenização e remoção de stopwords do português.</p>
            <p><strong>Padrão de votação:</strong> contagem de votos nominais em votações do plenário, agrupados por tema. O voto predominante é o tipo com maior frequência no tema. A distribuição geral mostra todos os votos somados.</p>
            <p><strong>Influência:</strong> score baseado no papel de autoria (autor principal = 1,0; coautor = 1/ordemAssinatura) multiplicado pela margem de aprovação de cada proposição aprovada no plenário. <code>Influência % = 70% × score_normalizado + 30% × taxa_aprovação</code>. Parlamentares sem proposições aprovadas no plenário não aparecem no ranking.</p>
          </InfoCard>
        </>
      )}
    </>
  );
}
