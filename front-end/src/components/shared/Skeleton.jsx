export function Skeleton({ width = '100%', height = 16, radius = 6, style }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

/* Loading placeholder mirroring a stat-row + two chart cards: the shape a
   freshly-loaded tab settles into, so the layout doesn't jump. */
export default function TabSkeleton({ stats = 4, charts = 2 }) {
  return (
    <div role="status" aria-busy="true" aria-label="Carregando dados">
      <Skeleton width="38%" height={26} style={{ marginBottom: '0.5rem' }} />
      <Skeleton width="55%" height={14} style={{ marginBottom: '1.75rem' }} />

      <div className="skeleton-stat-row">
        {Array.from({ length: stats }).map((_, i) => (
          <div key={i} className="skeleton-card" style={{ flex: 1, minWidth: 150 }}>
            <Skeleton width="60%" height={22} style={{ marginBottom: '0.6rem' }} />
            <Skeleton width="80%" height={12} />
          </div>
        ))}
      </div>

      <div className="grid-2">
        {Array.from({ length: charts }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <Skeleton width="50%" height={14} style={{ marginBottom: '1.1rem' }} />
            <Skeleton width="100%" height={300} radius={8} />
          </div>
        ))}
      </div>
    </div>
  );
}
