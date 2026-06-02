export default function LoadingSpinner({ text = 'Carregando…' }) {
  return (
    <div className="loading">
      <div className="spinner" />
      {text}
    </div>
  );
}
