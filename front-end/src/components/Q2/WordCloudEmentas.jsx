import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { fmtN } from '../../lib/formatters';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorBox from '../shared/ErrorBox';
import EmptyState from '../shared/EmptyState';
import WordCloudCanvas from './WordCloud';

const tooltipFmt = w => `${w.texto} — ${fmtN(w.peso)} ocorrências nas ementas`;

/**
 * Nuvem de palavras "clássica": palavras extraídas do texto das ementas das
 * proposições (tokenização + remoção de stopwords no back-end), com tamanho
 * proporcional à frequência de cada palavra no corpus.
 *
 * Props:
 *   partido {string} — sigla do partido para filtrar ('' ou undefined = todos).
 */
export default function WordCloudEmentas({ partido = '' }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setItems(null); // reset para exibir spinner durante refetch
    const url = partido
      ? `/q2/palavras-ementas?limit=120&partido=${encodeURIComponent(partido)}`
      : '/q2/palavras-ementas?limit=120';
    apiFetch(url)
      .then(rows => setItems(rows.map(r => ({ texto: r.palavra, peso: r.frequencia }))))
      .catch(e => setError(e.message));
  }, [partido]);

  if (error)         return <ErrorBox message={error} />;
  if (items === null) return <LoadingSpinner text="Analisando o texto das ementas… (a primeira carga pode demorar)" />;
  if (!items.length)  return <EmptyState hint="Nenhuma palavra foi extraída das ementas." />;

  return (
    <WordCloudCanvas
      items={items}
      tooltipFormatter={tooltipFmt}
      ariaLabel={`Nuvem das ${fmtN(items.length)} palavras mais frequentes nas ementas das proposições; tamanho proporcional à frequência. Palavra mais frequente: ${items[0].texto}.`}
    />
  );
}
