import { useState, useEffect, useMemo } from 'react';
import { Bar, Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement, CategoryScale, LinearScale,
  PointElement, LineElement,
  ScatterController, LineController,
  Tooltip, Legend,
} from 'chart.js';
import { apiFetch } from '../../lib/api';
import { fmt, fmtN, pct } from '../../lib/formatters';
import { PALETTE, baseFont, gridColor, tickColor, legendColor } from '../../lib/chartDefaults';
import { pearson, spearman, linreg, interpret } from '../../lib/stats';
import TabSkeleton from '../shared/Skeleton';
import ErrorBox from '../shared/ErrorBox';
import EmptyState from '../shared/EmptyState';
import InfoCard from '../shared/InfoCard';

ChartJS.register(
  BarElement, CategoryScale, LinearScale,
  PointElement, LineElement,
  ScatterController, LineController,
  Tooltip, Legend,
);

const SUB_TABS = [
  { id: 'gastos',      label: 'Gastos' },
  { id: 'fidelidade',  label: 'Fidelidade partidária' },
  { id: 'proposicoes', label: 'Proposições' },
  { id: 'presenca',    label: 'Presença no plenário' },
];

// ── helpers ──────────────────────────────────────────────────────────────────

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
        legend: grouped
          ? { display: true, labels: { color: legendColor, font: baseFont, boxWidth: 12 } }
          : { display: false },
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

/**
 * Constrói datasets para o gráfico scatter + reta de regressão.
 * rawData: array de DadosDeputadoCorrelacao
 * yAccessor: d => number|null
 * Retorna { scatterPts, linePts, r, rho, n }
 */
function buildScatterStats(rawData, yAccessor) {
  const pairs = rawData
    .map(d => ({ x: d.escolaridade_ord, y: yAccessor(d) }))
    .filter(p => p.y != null && !isNaN(p.y));

  const xs = pairs.map(p => p.x);
  const ys = pairs.map(p => p.y);

  const r   = pearson(xs, ys);
  const rho = spearman(xs, ys);
  const reg = linreg(xs, ys);

  // Jitter horizontal leve (somente visual) — fixo via índice para evitar re-render
  const scatterPts = pairs.map((p, i) => ({
    x: p.x + ((i * 2654435769) % 1000) / 1000 * 0.28 - 0.14, // pseudo-random estável
    y: p.y,
  }));

  const xMin = Math.min(...xs, 1) - 0.3;
  const xMax = Math.max(...xs, 4) + 0.3;
  const linePts = [
    { x: xMin, y: reg.slope * xMin + reg.intercept },
    { x: xMax, y: reg.slope * xMax + reg.intercept },
  ];

  return { scatterPts, linePts, r, rho, n: pairs.length };
}

/** Card exibindo os coeficientes de Pearson e Spearman. */
function CorrelCard({ r, rho, n }) {
  const iP = interpret(r);
  const iS = interpret(rho);
  return (
    <div className="correl-card">
      <div className="correl-stat">
        <span className="correl-label">r Pearson</span>
        <span className="correl-val" style={{ color: Math.abs(r) >= 0.4 ? 'var(--accent-strong)' : 'var(--ink)' }}>
          {r != null ? r.toFixed(3) : '—'}
        </span>
        <span className="correl-interp">{iP.forca} {iP.sinal !== iP.forca ? iP.sinal : ''}</span>
      </div>
      <div className="correl-stat">
        <span className="correl-label">ρ Spearman</span>
        <span className="correl-val" style={{ color: Math.abs(rho) >= 0.4 ? 'var(--accent-strong)' : 'var(--ink)' }}>
          {rho != null ? rho.toFixed(3) : '—'}
        </span>
        <span className="correl-interp">{iS.forca} {iS.sinal !== iS.forca ? iS.sinal : ''}</span>
      </div>
      <div className="correl-n">n = {n} deputados</div>
    </div>
  );
}

/** Scatter + reta de regressão usando Chart.js misto (scatter + line). */
function ScatterCorrel({ scatterPts, linePts, xLabel, yLabel, fmtFn }) {
  const scatterColor = PALETTE[0] + '55';
  const data = {
    datasets: [
      {
        type: 'scatter',
        label: 'Deputados',
        data: scatterPts,
        backgroundColor: scatterColor,
        borderColor: PALETTE[0] + '99',
        borderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        type: 'line',
        label: 'Tendência',
        data: linePts,
        borderColor: PALETTE[3],
        borderWidth: 2,
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: legendColor, font: baseFont, boxWidth: 12, filter: item => item.text !== 'Tendência' || true },
      },
      tooltip: {
        filter: item => item.datasetIndex === 0, // só pontos dos deputados
        callbacks: {
          label: ctx => {
            const raw = ctx.raw;
            const xOrd = Math.round(raw.x);
            const escLevels = { 1: 'Fundamental', 2: 'Médio', 3: 'Superior', 4: 'Pós-graduação' };
            return [
              `Escolaridade: ${escLevels[xOrd] ?? xOrd}`,
              `${yLabel}: ${fmtFn ? fmtFn(raw.y) : fmtN(raw.y)}`,
            ];
          }
        }
      }
    },
    scales: {
      x: {
        title: { display: true, text: xLabel, color: tickColor, font: baseFont },
        grid: { color: gridColor },
        ticks: {
          color: tickColor, font: baseFont, stepSize: 1,
          callback: v => ({ 1: 'Fund.', 2: 'Médio', 3: 'Super.', 4: 'Pós' }[v] ?? v),
        },
        min: 0.5, max: 4.5,
      },
      y: {
        title: { display: true, text: yLabel, color: tickColor, font: baseFont },
        grid: { color: gridColor },
        ticks: { color: tickColor, font: baseFont, callback: fmtFn || (v => fmtN(v)) },
      },
    },
  };
  return (
    <div className="chart-wrap-tall">
      <Chart type="scatter" data={data} options={options}
        role="img"
        aria-label={`Scatter de ${yLabel} por nível de escolaridade com reta de regressão.`}
      />
    </div>
  );
}

// ── Sub-abas ──────────────────────────────────────────────────────────────────

function SubGastos({ data, rawData }) {
  const labels     = data.map(d => d.escolaridade);
  const mediaGasto = barCfg(labels, data.map(d => d.media_gasto_por_deputado), PALETTE[0], fmt);
  const totalGasto = barCfg(labels, data.map(d => d.total_gasto), PALETTE[1], fmt);
  const mediaTrx   = barCfg(labels, data.map(d => d.media_por_transacao), PALETTE[5], fmt);

  const maxMedia = data.reduce((max, d) => d.media_gasto_por_deputado > max.media_gasto_por_deputado ? d : max, data[0]);

  const { scatterPts, linePts, r, rho, n } = useMemo(
    () => buildScatterStats(rawData, d => d.total_gasto || null),
    [rawData]
  );

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

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
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

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Dispersão individual — gasto total × escolaridade</h3>
        <CorrelCard r={r} rho={rho} n={n} />
        <ScatterCorrel
          scatterPts={scatterPts} linePts={linePts}
          xLabel="Nível de escolaridade" yLabel="Gasto total (R$)" fmtFn={fmt}
        />
      </div>
    </>
  );
}

function SubFidelidade({ data, rawData }) {
  const labels = data.map(d => d.escolaridade);
  const pctFid = barCfg(labels, data.map(d => d.pct_fidelidade), PALETTE[2], v => v.toFixed(1) + '%', 100);

  const groupedDatasets = [
    { label: 'Votos fiéis',       data: data.map(d => d.votos_fieis),           backgroundColor: PALETTE[2],        borderRadius: 4 },
    { label: 'Com orientação',    data: data.map(d => d.votos_com_orientacao),   backgroundColor: PALETTE[2] + '55', borderRadius: 4 },
  ];
  const volumeChart = barCfg(labels, null, null, null, null, groupedDatasets);

  const mediaFid = data.reduce((s, d) => s + d.pct_fidelidade, 0) / data.length;

  const { scatterPts, linePts, r, rho, n } = useMemo(
    () => buildScatterStats(rawData, d => d.pct_fidelidade),
    [rawData]
  );

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

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Volume de votos: fiéis vs total com orientação</h3>
        <div className="chart-wrap">
          <Bar data={volumeChart.data} options={volumeChart.options}
            role="img" aria-label="Volume de votos fiéis comparado ao total de votos com orientação partidária, por nível de escolaridade." />
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Dispersão individual — fidelidade % × escolaridade</h3>
        <CorrelCard r={r} rho={rho} n={n} />
        <ScatterCorrel
          scatterPts={scatterPts} linePts={linePts}
          xLabel="Nível de escolaridade" yLabel="% Fidelidade"
          fmtFn={v => v.toFixed(1) + '%'}
        />
      </div>
    </>
  );
}

function SubProposicoes({ data, rawData }) {
  const labels     = data.map(d => d.escolaridade);
  const mediaChart = barCfg(labels, data.map(d => d.media_por_deputado), PALETTE[3], v => fmtN(+v.toFixed(1)));
  const totalChart = barCfg(labels, data.map(d => d.total_proposicoes), PALETTE[6], fmtN);

  const maxMedia = data.reduce((max, d) => d.media_por_deputado > max.media_por_deputado ? d : max, data[0]);

  const { scatterPts, linePts, r, rho, n } = useMemo(
    () => buildScatterStats(rawData, d => d.num_proposicoes || null),
    [rawData]
  );

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

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Total absoluto de proposições por nível</h3>
        <div className="chart-wrap">
          <Bar data={totalChart.data} options={totalChart.options}
            role="img" aria-label="Total absoluto de proposições por nível de escolaridade." />
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Dispersão individual — proposições × escolaridade</h3>
        <CorrelCard r={r} rho={rho} n={n} />
        <ScatterCorrel
          scatterPts={scatterPts} linePts={linePts}
          xLabel="Nível de escolaridade" yLabel="Nº de proposições" fmtFn={fmtN}
        />
      </div>
    </>
  );
}

function SubPresenca({ data, rawData }) {
  const labels     = data.map(d => d.escolaridade);
  const mediaChart = barCfg(labels, data.map(d => d.media_por_deputado), PALETTE[4], v => fmtN(+v.toFixed(1)));
  const totalChart = barCfg(labels, data.map(d => d.total_presencas_plenario), PALETTE[7], fmtN);

  const maxMedia = data.reduce((max, d) => d.media_por_deputado > max.media_por_deputado ? d : max, data[0]);

  const { scatterPts, linePts, r, rho, n } = useMemo(
    () => buildScatterStats(rawData, d => d.num_presencas || null),
    [rawData]
  );

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

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Total absoluto de presenças por nível</h3>
        <div className="chart-wrap">
          <Bar data={totalChart.data} options={totalChart.options}
            role="img" aria-label="Total absoluto de presenças no plenário por nível de escolaridade." />
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Dispersão individual — presenças × escolaridade</h3>
        <CorrelCard r={r} rho={rho} n={n} />
        <ScatterCorrel
          scatterPts={scatterPts} linePts={linePts}
          xLabel="Nível de escolaridade" yLabel="Nº de presenças" fmtFn={fmtN}
        />
      </div>
    </>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Q6Tab() {
  const [gastos,   setGastos]   = useState([]);
  const [fid,      setFid]      = useState([]);
  const [prop,     setProp]     = useState([]);
  const [plen,     setPlen]     = useState([]);
  const [rawData,  setRawData]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [activeSub, setActiveSub] = useState('gastos');

  useEffect(() => {
    Promise.all([
      apiFetch('/q6/gastos'),
      apiFetch('/q6/fidelidade-partidaria'),
      apiFetch('/q6/proposicoes'),
      apiFetch('/q6/presenca-plenario'),
      apiFetch('/q6/dados-deputado'),
    ]).then(([g, f, p, pl, raw]) => {
      setGastos(g); setFid(f); setProp(p); setPlen(pl); setRawData(raw);
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TabSkeleton stats={2} />;
  if (error)   return <ErrorBox message={error} />;

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

      {activeSub === 'gastos'      && <SubGastos      data={gastos} rawData={rawData} />}
      {activeSub === 'fidelidade'  && <SubFidelidade  data={fid}    rawData={rawData} />}
      {activeSub === 'proposicoes' && <SubProposicoes data={prop}   rawData={rawData} />}
      {activeSub === 'presenca'    && <SubPresenca    data={plen}   rawData={rawData} />}

      <InfoCard>
        <p>Esta seção combina duas perspectivas sobre a relação entre <strong>escolaridade e comportamento parlamentar</strong>. Para cada aba há três visualizações complementares:</p>
        <ul>
          <li><strong>Gráficos de barra</strong>: mostram a <em>média por faixa de escolaridade</em> — boa para comparar os 4 grupos de forma direta.</li>
          <li><strong>Gráfico de dispersão</strong>: mostra <em>um ponto por deputado</em> com pequeno deslocamento horizontal aleatório para evitar sobreposição. A <strong>reta tracejada</strong> é a regressão linear — sua inclinação indica se a tendência é positiva (sobe com a escolaridade), negativa (desce) ou nula (horizontal).</li>
          <li><strong>Card de coeficientes</strong>: dois números que quantificam a intensidade da tendência.</li>
        </ul>

        <p><strong>Como ler os coeficientes:</strong> ambos variam de <code>−1</code> a <code>+1</code>.</p>
        <ul>
          <li><code>+1</code> → correlação positiva perfeita: quanto maior a escolaridade, maior o valor da métrica.</li>
          <li><code>−1</code> → correlação negativa perfeita: quanto maior a escolaridade, menor o valor.</li>
          <li><code>0</code> → nenhuma tendência linear detectável.</li>
        </ul>
        <p><strong>Escala de força:</strong> |coef.| ≥ 0,70 → <em>forte</em> · 0,40–0,69 → <em>moderada</em> · 0,20–0,39 → <em>fraca</em> · &lt; 0,20 → <em>muito fraca ou desprezível</em>.</p>

        <p><strong>Pearson (r)</strong> assume que as variáveis são numéricas contínuas e mede a proporção da variação de Y explicada por uma relação linear com X. <strong>Spearman (ρ)</strong> trabalha com os <em>postos ordenados</em> de cada valor, e por isso é mais robusto a outliers e mais adequado para a escolaridade, que é uma variável <em>ordinal</em> (Fundamental &lt; Médio &lt; Superior &lt; Pós-graduação), não propriamente contínua. Quando os dois diferem muito, desconfie de outliers que inflam o Pearson.</p>

        <p><strong>O que observar em cada aba:</strong></p>
        <ul>
          <li><strong>Gastos</strong>: um r positivo e significativo indicaria que deputados mais escolarizados gastam mais com a cota parlamentar. Observe se a nuvem de pontos no scatter sobe da esquerda (Fundamental) para a direita (Pós-graduação) e se a reta confirma essa inclinação.</li>
          <li><strong>Fidelidade partidária</strong>: um r negativo indicaria que maior escolaridade está associada a votos mais independentes da orientação do partido. Atenção: deputados sem nenhum voto com orientação registrada são excluídos (aparecem como <code>null</code> no scatter).</li>
          <li><strong>Proposições</strong>: um r positivo e forte sugeriria que deputados com mais escolaridade apresentam mais projetos. Outliers (deputados com centenas de proposições) costumam puxar a reta — compare r e ρ para saber o quanto.</li>
          <li><strong>Presença no plenário</strong>: avalia se a assiduidade nas sessões deliberativas varia com o nível educacional. Distribuições muito concentradas em torno de um valor (ex.: quase todos com presença alta) resultam em coeficientes próximos de zero mesmo que a barra de média pareça diferir entre grupos.</li>
        </ul>

        <p><strong>Atenção metodológica:</strong> o nível <strong>"Sem informação"</strong> é excluído da análise. Grupos com poucos deputados (especialmente Fundamental, com menos de 10 parlamentares) produzem médias mais voláteis e podem distorcer os coeficientes — dê mais peso ao ρ de Spearman nesses casos, pois ele é menos sensível ao tamanho desigual dos grupos.</p>
      </InfoCard>
    </>
  );
}
