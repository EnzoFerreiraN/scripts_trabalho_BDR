export function fmt(n) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

export function fmtN(n) {
  return new Intl.NumberFormat('pt-BR').format(n);
}

export function pct(n) {
  return n == null ? '—' : (+n).toFixed(1) + '%';
}

export function initials(nome) {
  return (nome || '').split(' ').filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

export function shortName(nome) {
  const p = (nome || '').split(' ');
  return p.length <= 3 ? nome : p.slice(0, 3).join(' ');
}
