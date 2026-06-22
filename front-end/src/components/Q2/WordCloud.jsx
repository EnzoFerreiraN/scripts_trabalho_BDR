import { useEffect, useRef, useState, useCallback } from 'react';
import WordCloud from 'wordcloud';
import { PALETTE, wordcloudBg, baseFont } from '../../lib/chartDefaults';
import { fmtN } from '../../lib/formatters';

const MIN_FONT = 12;
const MAX_FONT = 96;   // teto mais alto para ampliar contraste visual
const HEIGHT   = 360;

// Hash determinístico de string → índice estável na PALETTE.
// Garante que cada palavra mantém a mesma cor entre renders/visitas.
function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Nuvem de palavras genérica (canvas).
 *
 * Props:
 *   items            — array de { texto, peso, ...extras }
 *   onWordClick      — callback (item) ao clicar numa palavra (opcional)
 *   tooltipFormatter — (item) => string exibida no tooltip (opcional)
 *   ariaLabel        — descrição acessível do gráfico (opcional)
 *
 * O tamanho da fonte é proporcional a √(peso/maxPeso) — escala raiz quadrada,
 * pois o olho percebe área (≈ fonte²), não altura. Mapeada para [12, 64]px.
 */
export default function WordCloudCanvas({ items, onWordClick, tooltipFormatter, ariaLabel }) {
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);
  const [tooltip, setTooltip] = useState(null); // { x, y, text }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap || !items.length) return;
    setTooltip(null);

    // Desenha em resolução física (devicePixelRatio) e exibe em tamanho CSS:
    // evita blur em telas de alta densidade.
    const dpr      = window.devicePixelRatio || 1;
    const cssWidth = wrap.offsetWidth || 900;
    canvas.width  = cssWidth * dpr;
    canvas.height = HEIGHT * dpr;
    canvas.style.width  = '100%';
    canvas.style.height = `${HEIGHT}px`;

    const maxPeso = Math.max(...items.map(d => d.peso));
    const minPeso = Math.min(...items.map(d => d.peso));
    const range   = maxPeso - minPeso || 1; // evita divisão por zero se todos iguais
    const list = items.map(d => [
      d.texto,
      // Normaliza no intervalo real [minPeso, maxPeso] e aplica expoente 0.7:
      // dá contraste pleno (menor→piso, maior→teto) com curva suave que
      // preserva área perceptível nos termos intermediários.
      Math.round((MIN_FONT + Math.pow((d.peso - minPeso) / range, 0.7) * (MAX_FONT - MIN_FONT)) * dpr),
    ]);

    WordCloud(canvas, {
      list,
      fontFamily: baseFont.family,
      color: word => PALETTE[hashString(word) % PALETTE.length],
      backgroundColor: wordcloudBg,
      rotateRatio: 0,
      minSize: 8 * dpr,
      drawOutOfBound: false,
      shrinkToFit: true,
      click: item => {
        if (!onWordClick) return;
        const obj = items.find(d => d.texto === item[0]);
        if (obj) onWordClick(obj);
      },
      hover: (item, dimension, event) => {
        if (!item) {
          setTooltip(null);
          canvas.style.cursor = 'default';
          return;
        }
        canvas.style.cursor = onWordClick ? 'pointer' : 'default';
        const obj = items.find(d => d.texto === item[0]);
        setTooltip({
          x: event.offsetX,
          y: event.offsetY,
          text: tooltipFormatter && obj
            ? tooltipFormatter(obj)
            : `${item[0]} — ${obj ? fmtN(obj.peso) : ''}`,
        });
      },
    });
  }, [items, onWordClick, tooltipFormatter]);

  useEffect(() => {
    draw();
    const wrap = wrapRef.current;
    if (!wrap) return;

    // Redesenha quando a largura do container muda (debounce de 200ms).
    let timer;
    let lastWidth = wrap.offsetWidth;
    const ro = new ResizeObserver(() => {
      if (wrap.offsetWidth === lastWidth || wrap.offsetWidth === 0) return;
      lastWidth = wrap.offsetWidth;
      clearTimeout(timer);
      timer = setTimeout(draw, 200);
    });
    ro.observe(wrap);
    return () => { clearTimeout(timer); ro.disconnect(); };
  }, [draw]);

  if (!items.length) return null;

  const pesos   = items.map(d => d.peso);
  const minPeso = Math.min(...pesos);
  const maxPeso = Math.max(...pesos);
  const top     = items.reduce((a, b) => (b.peso > a.peso ? b : a));

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel
          ?? `Nuvem de palavras com ${fmtN(items.length)} termos; tamanho proporcional ao peso. Maior termo: ${top.texto} (${fmtN(top.peso)}).`}
        onMouseLeave={() => setTooltip(null)}
        style={{ width: '100%', height: `${HEIGHT}px`, display: 'block' }}
      />
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(tooltip.x + 12, (wrapRef.current?.offsetWidth ?? 900) - 160),
            top: tooltip.y + 14,
            background: 'rgba(38,38,58,0.92)',
            color: '#fff',
            padding: '0.3rem 0.55rem',
            borderRadius: 6,
            fontSize: '0.75rem',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          {tooltip.text}
        </div>
      )}
      <p style={{ fontSize: '0.72rem', color: 'var(--muted)', margin: '0.45rem 0 0' }}>
        Escala: menor = {fmtN(minPeso)} · maior = {fmtN(maxPeso)} · tamanho ∝ (peso − mín)^0.7
      </p>
    </div>
  );
}
