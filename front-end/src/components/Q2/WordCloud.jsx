import { useEffect, useRef } from 'react';
import WordCloud from 'wordcloud';
import { PALETTE } from '../../lib/chartDefaults';

export default function WordCloudCanvas({ data }) {
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
      fontFamily: "'Segoe UI', sans-serif",
      color: () => PALETTE[Math.floor(Math.random() * PALETTE.length)],
      backgroundColor: '#1a1d27',
      rotateRatio: 0,
      minSize: 8,
      weightFactor: 1,
      drawOutOfBound: false,
      shrinkToFit: true,
    });
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '360px', display: 'block' }}
    />
  );
}
