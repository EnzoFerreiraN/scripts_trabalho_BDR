// Categorical palette tuned for a light background: mid-lightness, saturated
// tones that stay legible on white. Keep this in sync with the tokens in
// global.css (light editorial theme).
export const PALETTE = [
  '#4f46e5','#0d9488','#d97706','#db2777','#2563eb','#7c3aed',
  '#059669','#ea580c','#e11d48','#0891b2','#9333ea','#ca8a04',
  '#16a34a','#c026d3','#dc2626','#65a30d','#4338ca','#0284c7'
];

export const VOTE_COLORS = {
  'Sim': '#059669', 'Não': '#dc2626',
  'Abstenção': '#d97706', 'Obstrução': '#6366f1', 'Artigo 17': '#ea580c'
};

// Shared chart chrome colors (light theme).
export const tickColor = '#55556a';   // axis ticks / muted labels
export const legendColor = '#26263a'; // legend text (ink)
export const gridColor = 'rgba(20,20,40,0.08)';
export const wordcloudBg = '#ffffff';

export const baseFont = { color: tickColor, family: "'Inter', system-ui, sans-serif", size: 11 };

export function hBarData(labels, data) {
  return {
    labels,
    datasets: [{ data, backgroundColor: PALETTE, borderRadius: 4, borderSkipped: false }]
  };
}

export function hBarOptions(fmtFn) {
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: c => ' ' + (fmtFn ? fmtFn(c.raw) : c.raw) } }
    },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: tickColor, font: baseFont } },
      y: { grid: { display: false }, ticks: { color: legendColor, font: { size: 10, family: baseFont.family } } }
    }
  };
}
