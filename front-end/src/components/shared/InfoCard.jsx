export default function InfoCard({ title = 'Metodologia & notas', children }) {
  return (
    <div className="info-card">
      <div className="info-card-title">
        <span className="info-icon">ℹ</span> {title}
      </div>
      <div className="info-card-body">{children}</div>
    </div>
  );
}
