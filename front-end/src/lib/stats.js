/**
 * Funções estatísticas puras para os gráficos de correlação (Q6).
 * Todas aceitam arrays de números e retornam null quando n < 2.
 */

/** Coeficiente de correlação de Pearson. */
export function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const den = Math.sqrt(dx2 * dy2);
  return den === 0 ? 0 : num / den;
}

/** Correlação de postos de Spearman (mais adequada p/ escolaridade ordinal). */
export function spearman(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;

  function rank(arr) {
    const indexed = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n - 1 && indexed[j + 1].v === indexed[j].v) j++;
      const avg = (i + j) / 2 + 1; // média de postos para empates
      for (let k = i; k <= j; k++) ranks[indexed[k].i] = avg;
      i = j + 1;
    }
    return ranks;
  }

  return pearson(rank(xs), rank(ys));
}

/** Regressão linear simples: retorna { slope, intercept }. */
export function linreg(xs, ys) {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 };
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: my - slope * mx };
}

/**
 * Interpreta o coeficiente r em força e sinal.
 * Retorna { forca: 'forte'|'moderada'|'fraca'|'muito fraca', sinal: 'positiva'|'negativa'|'nula' }
 */
export function interpret(r) {
  if (r === null) return { forca: '—', sinal: '—' };
  if (r === 0) return { forca: 'nula', sinal: 'nula' };
  const abs = Math.abs(r);
  const sinal = r > 0 ? 'positiva' : 'negativa';
  let forca;
  if (abs >= 0.7) forca = 'forte';
  else if (abs >= 0.4) forca = 'moderada';
  else if (abs >= 0.2) forca = 'fraca';
  else forca = 'muito fraca';
  return { forca, sinal };
}
