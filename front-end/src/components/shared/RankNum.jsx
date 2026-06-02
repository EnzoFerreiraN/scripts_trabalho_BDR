export default function RankNum({ rank }) {
  const cls = rank <= 3 ? `rank-${rank}` : 'rank-n';
  return <span className={`rank-num ${cls}`}>{rank}</span>;
}
