import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend
} from 'chart.js';
import { apiFetch } from '../../lib/api';
import { fmt, fmtN, pct } from '../../lib/formatters';
import { PALETTE, baseFont, gridColor, tickColor, legendColor } from '../../lib/chartDefaults';
import TabSkeleton from '../shared/Skeleton';
import ErrorBox from '../shared/ErrorBox';
import EmptyState from '../shared/EmptyState';
import InfoCard from '../shared/InfoCard';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const SUB_TABS = [
  { id: 'gastos',      label: 'Gastos' },
  { id: 'fidelidade',  label: 'Fidelidade partidária' },
  { id: 'proposicoes', label: 'Proposições' },
  { id: 'presenca',    label: 'Presença no plenário' },
];

function barCfg(labels, values, color, fmtFn, maxY, grouped) {
  return {
    data: {
      labels,
      datasets: grouped
        ? grouped
        : [{ data: values, backgroundColor: color, borderRadius: 6 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: grouped ? { display: true, labels: { color: legendColor, font: baseFont, boxWidth: 12 } } : { display: false },
        tooltip: { callbacks: { label: c => ' ' + (fmtFn ? fmtFn(c.raw) : fmtN(c.raw)) } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: tickColor, font: baseFont } },
        y: {
          ...(maxY ? { max: maxY } : {}),
          grid: { color: gridColor },
          ticks: { color: tickColor, font: baseFont, callback: fmtFn || (v => fmtN(v)) }
        }
      }
    }
  };
}

function SubGastos({ data }) {
  const labels = data.map(d => d.escolaridade);
  const mediaGasto = barCfg(labels, data.map(d => d.media_gasto_por_deputado), PALETTE[0], fmt);
  const totalGasto = barCfg(labels, data.map(d => d.total_gasto), PALETTE[1], fmt);
  const mediaTrx   = barCfg(labels, data.map(d => d.media_por_transacao), PALETTE[5], fmt);

  const maxMedia = data.reduce((max, d) => d.media_gasto_por_deputado > max.media_gasto_por_deputado ? d : max, data[0]);

  return (
    <>
      <div className="stat-row">
        <div className="stat">
          <div className="val">{fmt(maxMedia.media_gasto_por_deputado)}</div>
          <div className="lbl">Maior média de gasto — {maxMedia.escolaridade}</div>
        </div>
        <div className="stat">
          <div className="val">{fmt(data.reduce((s, d) => s + d.total_gasto, 0))}</div>
          <div className="lbl">Total gasto por todos os níveis</div>
        </div>
      </div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Média de gasto por deputado (por nível de escolaridade)</h3>
        <div className="chart-wrap">
          <Bar data={mediaGasto.data} options={mediaGasto.options}
            role="img"
            aria-label={`Média de gasto por deputado por nível de escolaridade. Maior: ${maxMedia.escolaridade}, ${fmt(maxMedia.media_gasto_por_deputado)}.`} />
        </div>
      </div>
      <div className="grid-2">
        <div className="card">
          <h3>Total gasto absoluto por nível</h3>
          <div className="chart-wrap">
            <Bar data={totalGasto.data} options={totalGasto.options}
              role="img" aria-label="Total gasto absoluto por nível de escolaridade." />
          </div>
        </div>
        <div className="card">
          <h3>Média de gasto por transação</h3>
          <div className="chart-wrap">
            <Bar data={mediaTrx.data} options={mediaTrx.options}
              role="img" aria-label="Média de gasto por transação por nível de escolaridade." />
          </div>
        </div>
      </div>
    </>
  );
}

function SubFidelidade({ data }) {
  const labels = data.map(d => d.escolaridade);
  const pctFid = barCfg(labels, data.map(d => d.pct_fidelidade), PALETTE[2], v => v.toFixed(1) + '%', 100);

  const groupedDatasets = [
    {
      label: 'Votos fiéis',
      data: data.map(d => d.votos_fieis),
      backgroundColor: PALETTE[2],
      borderRadius: 4,
    },
    {
      label: 'Com orientação',
      data: data.map(d => d.votos_com_orientacao),
      backgroundColor: PALETTE[2] + '55',
      borderRadius: 4,
    },
  ];
  const volumeChart = barCfg(labels, null, null, null, null, groupedDatasets);

  const mediaFid = data.reduce((s, d) => s + d.pct_fidelidade, 0) / data.length;

  return (
    <>
      <div className="stat-row">
        <div className="stat">
          <div className="val">{pct(mediaFid)}</div>
          <div className="lbl">Média geral de fidelidade partidária</div>
        </div>
        <div className="stat">
          <div className="val">{pct(Math.max(...data.map(d => d.pct_fidelidade)))}</div>
          <div className="lbl">Maior % fidelidade</div>
        </div>
      </div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>% Fidelidade por nível de escolaridade</h3>
        <div className="chart-wrap">
          <Bar data={pctFid.data} options={pctFid.options}
            role="img"
            aria-label={`Percentual de fidelidade partidária por nível de escolaridade. Média geral: ${pct(mediaFid)}.`} />
        </div>
      </div>
      <div className="card">
        <h3>Volume de votos: fiéis vs total com orientação</h3>
        <div className="chart-wrap">
          <Bar data={volumeChart.data} options={volumeChart.options}
            role="img" aria-label="Volume de votos fiéis comparado ao total de votos com orientação partidária, por nível de escolaridade." />
        </div>
      </div>
    </>
  );
}

function SubProposicoes({ data }) {
  const labels = data.map(d => d.escolaridade);
  const mediaChart = barCfg(labels, data.map(d => d.media_por_deputado), PALETTE[3], v => fmtN(+v.toFixed(1)));
  const totalChart = barCfg(labels, data.map(d => d.total_proposicoes), PALETTE[6], fmtN);

  const maxMedia = data.reduce((max, d) => d.media_por_deputado > max.media_por_deputado ? d : max, data[0]);

  return (
    <>
      <div className="stat-row">
        <div className="stat">
          <div className="val">{fmtN(+maxMedia.media_por_deputado.toFixed(1))}</div>
          <div className="lbl">Maior média de proposições — {maxMedia.escolaridade}</div>
        </div>
        <div className="stat">
          <div className="val">{fmtN(data.reduce((s, d) => s + d.total_proposicoes, 0))}</div>
          <div className="lbl">Total de proposições no período</div>
        </div>
      </div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Média de proposições por deputado (por nível de escolaridade)</h3>
        <div className="chart-wrap">
          <Bar data={mediaChart.data} options={mediaChart.options}
            role="img"
            aria-label={`Média de proposições por deputado por nível de escolaridade. Maior: ${maxMedia.escolaridade}, ${fmtN(+maxMedia.media_por_deputado.toFixed(1))}.`} />
        </div>
      </div>
      <div className="card">
        <h3>Total absoluto de proposições por nível</h3>
        <div className="chart-wrap">
          <Bar data={totalChart.data} options={totalChart.options}
            role="img" aria-label="Total absoluto de proposições por nível de escolaridade." />
        </div>
      </div>
    </>
  );
}

function SubPresenca({ data }) {
  const labels = data.map(d => d.escolaridade);
  const mediaChart = barCfg(labels, data.map(d => d.media_por_deputado), PALETTE[4], v => fmtN(+v.toFixed(1)));
  const totalChart = barCfg(labels, data.map(d => d.total_presencas_plenario), PALETTE[7], fmtN);

  const maxMedia = data.reduce((max, d) => d.media_por_deputado > max.media_por_deputado ? d : max, data[0]);

  return (
    <>
      <div className="stat-row">
        <div className="stat">
          <div className="val">{fmtN(+maxMedia.media_por_deputado.toFixed(1))}</div>
          <div className="lbl">Maior média de presenças — {maxMedia.escolaridade}</div>
        </div>
        <div className="stat">
          <div className="val">{fmtN(data.reduce((s, d) => s + d.total_presencas_plenario, 0))}</div>
          <div className="lbl">Total de presenças no período</div>
        </div>
      </div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Média de presenças no plenário (por nível de escolaridade)</h3>
        <div className="chart-wrap">
          <Bar data={mediaChart.data} options={mediaChart.options}
            role="img"
            aria-label={`Média de presenças no plenário por deputado por nível de escolaridade. Maior: ${maxMedia.escolaridade}, ${fmtN(+maxMedia.media_por_deputado.toFixed(1))}.`} />
        </div>
      </div>
      <div className="card">
        <h3>Total absoluto de presenças por nível</h3>
        <div className="chart-wrap">
          <Bar data={totalChart.data} options={totalChart.options}
            role="img" aria-label="Total absoluto de presenças no plenário por nível de escolaridade." />
        </div>
      </div>
    </>
  );
}

export default function Q6Tab() {
  const [gastos, setGastos]   = useState([]);
  const [fid, setFid]         = useState([]);
  const [prop, setProp]       = useState([]);
  const [plen, setPlen]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSub, setActiveSub] = useState('gastos');

  useEffect(() => {
    Promise.all([
      apiFetch('/q6/gastos'),
      apiFetch('/q6/fidelidade-partidaria'),
      apiFetch('/q6/proposicoes'),
      apiFetch('/q6/presenca-plenario'),
    ]).then(([g, f, p, pl]) => {
      setGastos(g); setFid(f); setProp(p); setPlen(pl);
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TabSkeleton stats={2} />;
  if (error) return <ErrorBox message={error} />;

  if (!gastos.length) {
    return (
      <>
        <p className="section-title">Escolaridade &amp; comportamento parlamentar</p>
        <EmptyState hint="Nenhum dado de comportamento parlamentar foi retornado." />
      </>
    );
  }

  return (
    <>
      <p className="section-title">Escolaridade & comportamento parlamentar</p>
      <p className="section-subtitle">Correlação entre o nível de escolaridade declarado e métricas de comportamento parlamentar · 2023–2026</p>

      <div className="sub-nav">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={activeSub === t.id ? 'active' : ''}
            onClick={() => setActiveSub(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeSub === 'gastos'      && <SubGastos      data={gastos} />}
      {activeSub === 'fidelidade'  && <SubFidelidade  data={fid} />}
      {activeSub === 'proposicoes' && <SubProposicoes data={prop} />}
      {activeSub === 'presenca'    && <SubPresenca    data={plen} />}

      <InfoCard>
        <p>Análise de correlação entre o <strong>nível de escolaridade declarado</strong> e quatro métricas de comportamento parlamentar: gastos da CEAP, fidelidade a orientações partidárias, número de proposições e presença em sessões do plenário.</p>
        <p><strong>Atenção:</strong> correlação não implica causalidade. O tamanho dos grupos por nível varia significativamente — níveis com poucos deputados podem apresentar médias mais voláteis. Use as abas acima para explorar cada dimensão separadamente.</p>
      </InfoCard>
    </>
  );
}
