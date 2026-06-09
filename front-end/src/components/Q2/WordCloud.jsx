import { useEffect, useRef } from 'react';
import WordCloud from 'wordcloud';
import { PALETTE, wordcloudBg, baseFont } from '../../lib/chartDefaults';

/**
 * Props:
 *   data         — array de { codTema, tema, num_proposicoes, ... }
 *   onTemaClick  — callback (temaObj) chamado ao clicar numa palavra
 */
export default function WordCloudCanvas({ data, onTemaClick }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    canvas.width  = canvas.offsetWidth || 900;
    canvas.height = 360;

    const maxProp = Math.max(...data.map(d => d.num_proposicoes));
    const wcList  = data.map(d => [
      d.tema,
      Math.round(12 + (d.num_proposicoes / maxProp) * 52),
    ]);

    WordCloud(canvas, {
      list: wcList,
      fontFamily: baseFont.family,
      color: () => PALETTE[Math.floor(Math.random() * PALETTE.length)],
      backgroundColor: wordcloudBg,
      rotateRatio: 0,
      minSize: 8,
      weightFactor: 1,
      drawOutOfBound: false,
      shrinkToFit: true,
      // Clique na palavra abre o modal de deputados
      click: item => {
        if (!onTemaClick) return;
        const temaObj = data.find(d => d.tema === item[0]);
        if (temaObj) onTemaClick(temaObj);
      },
    });

    // Cursor pointer sobre palavras
    canvas.style.cursor = 'default';
    canvas.addEventListener('wordclouddrawn', () => {
      canvas.style.cursor = 'pointer';
    });
  }, [data, onTemaClick]);

  const top = data.length ? [...data].sort((a, b) => b.num_proposicoes - a.num_proposicoes)[0] : null;

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={top
        ? `Nuvem de palavras dos eixos de atuação legislativa; tamanho proporcional ao nº de proposições. Maior tema: ${top.tema}. Clique numa palavra para ver os deputados.`
        : 'Nuvem de palavras dos eixos de atuação legislativa.'}
      style={{ width: '100%', height: '360px', display: 'block', cursor: 'pointer' }}
    />
  );
}
