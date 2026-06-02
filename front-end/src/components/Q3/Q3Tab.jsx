import { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { apiFetch } from '../../lib/api';
import { fmtN, pct } from '../../lib/formatters';
import { VOTE_COLORS, baseFont } from '../../lib/chartDefaults';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorBox from '../shared/ErrorBox';
import Avatar from '../shared/Avatar';
import DeputadoSearch from './DeputadoSearch';
import InfoCard from '../shared/InfoCard';

ChartJS.register(ArcElement, Tooltip, Legend);

function voteColor(v) { return VOTE_COLORS[v] || '#4f8ef7'; }

export default function Q3Tab() {
  const [temas, setTemas] = useState([]);
  const [deputados, setDeputados] = useState([]);
  const [selectedDep, setSelectedDep] = useState(null);
  const [selectedTema, setSelectedTema] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([apiFetch('/q3/temas'), apiFetch('/q3/deputados')])
      .then(([t, d]) => {
        setTemas(t);
        setDeputados(d);
        if (t.length) setSelectedTema(t[0].tema);
      })
      .catch(console.error);
  }, []);

  async function buscar() {
    if (!selectedDep) { setError('Selecione um deputado da lista.'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await apiFetch(`/q3/votos?deputado_id=${selectedDep.id}&tema=${encodeURIComponent(selectedTema)}`);
      if (!data.length) { setError('Nenhum resultado encontrado.'); return; }
      setResult({
        nome: data[0].nome,
        urlFoto: data[0].urlFoto || null,
        total: data.reduce((s, d) => s + d.num_votos, 0),
        votes: data,
      });
    } catch (e) {
      setError('Erro: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const donutData = result ? {
    labels: result.votes.map(d => d.voto),
    datasets: [{
      data: result.votes.map(d => d.num_votos),
      backgroundColor: result.votes.map(d => voteColor(d.voto)),
      borderWidth: 0,
    }]
  } : null;

  const donutOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'right', labels: { color: '#e2e6f0', font: baseFont, boxWidth: 12 } } }
  };

  return (
    <>
      <p className="section-title">Padrão de votação por tema</p>
      <p className="section-subtitle">Escolha um deputado e um tema legislativo para ver como ele votou · Período 2023–2026</p>

      <div className="controls">
        <DeputadoSearch deputados={deputados} value={selectedDep} onChange={setSelectedDep} />
        <div>
          <label>Tema</label>
          <select value={selectedTema} onChange={e => setSelectedTema(e.target.value)}>
            {!temas.length && <option value="">— carregando temas —</option>}
            {temas.map(t => (
              <option key={t.codTema} value={t.tema}>{t.tema}</option>
            ))}
          </select>
        </div>
        <button onClick={buscar}>Buscar</button>
      </div>

      {loading && <LoadingSpinner text="Buscando…" />}
      {error && <ErrorBox message={error} />}

      {result && (
        <>
          <div className="q3-hero">
            <Avatar urlFoto={result.urlFoto} nome={result.nome} size="lg" />
            <div className="q3-hero-info">
              <div className="dep-name">{result.nome}</div>
              <div className="dep-sub">ID {selectedDep?.id}</div>
              <div className="dep-total">{fmtN(result.total)} votos computados no tema "{selectedTema}"</div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <h3>Distribuição dos votos</h3>
              <div className="chart-wrap"><Doughnut data={donutData} options={donutOpts} /></div>
            </div>
            <div className="card">
              <h3>Votos por tipo</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th>Voto</th>
                    <th style={{ textAlign: 'right' }}>Quantidade</th>
                    <th style={{ textAlign: 'right' }}>%</th>
                  </tr></thead>
                  <tbody>
                    {result.votes.map(d => (
                      <tr key={d.voto}>
                        <td>
                          <span className="badge" style={{
                            background: voteColor(d.voto) + '22',
                            color: voteColor(d.voto)
                          }}>
                            {d.voto}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{fmtN(d.num_votos)}</td>
                        <td style={{ textAlign: 'right' }}>{pct(d.pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      <InfoCard>
        <p>Registros de <strong>votação nominal</strong> extraídos das sessões do plenário. O padrão de votação é calculado contando a frequência de cada tipo de voto (<strong>Sim, Não, Abstenção, Obstrução, Art. 17</strong>) do deputado selecionado nas votações classificadas no tema escolhido.</p>
        <p>Selecione um deputado pelo nome e um tema legislativo, depois clique em <strong>Buscar</strong> para carregar o padrão de votos.</p>
      </InfoCard>
    </>
  );
}
