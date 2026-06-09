export default function EmptyState({
  title = 'Nenhum dado disponível',
  hint = 'Não há registros para exibir no momento.',
}) {
  return (
    <div className="empty-state">
      <svg className="empty-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 9h18M8 13h8M8 16.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div className="empty-title">{title}</div>
      <div className="empty-hint">{hint}</div>
    </div>
  );
}
