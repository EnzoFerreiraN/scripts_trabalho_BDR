export const PALETTE = [
  '#4f8ef7','#7c5cfc','#34d399','#fbbf24','#f87171','#38bdf8',
  '#a78bfa','#fb923c','#4ade80','#f472b6','#60a5fa','#facc15',
  '#c084fc','#2dd4bf','#fb7185','#a3e635','#818cf8','#e879f9'
];

export const VOTE_COLORS = {
  'Sim': '#34d399', 'Não': '#f87171',
  'Abstenção': '#fbbf24', 'Obstrução': '#818cf8', 'Artigo 17': '#fb923c'
};

export const baseFont = { color: '#8892a4', family: "'Segoe UI', sans-serif", size: 11 };
export const gridColor = 'rgba(42,45,62,0.8)';

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
      x: { grid: { color: gridColor }, ticks: { color: '#8892a4', font: baseFont } },
      y: { grid: { display: false }, ticks: { color: '#e2e6f0', font: { size: 10 } } }
    }
  };
}
