import Avatar from '../shared/Avatar';
import Badge from '../shared/Badge';
import { fmt, fmtN, shortName } from '../../lib/formatters';

export default function DeputadoCard({ dep, rank, onClick }) {
  const rankCls = rank <= 3 ? `dc-rank-${rank}` : 'dc-rank-n';

  function handleKey(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(dep);
    }
  }

  return (
    <div
      className="deputy-card"
      role="button"
      tabIndex={0}
      aria-label={`Ver gastos de ${dep.nome}`}
      onClick={() => onClick(dep)}
      onKeyDown={handleKey}
    >
      <div className={`deputy-card-rank ${rankCls}`}>{rank}</div>
      <Avatar urlFoto={dep.urlFoto} nome={dep.nome} size="lg" />
      <div className="deputy-card-name">{shortName(dep.nome)}</div>
      <div className="deputy-card-meta">
        <Badge variant="blue">{dep.partido}</Badge>
        <Badge variant="gray">{dep.uf}</Badge>
      </div>
      <div className="deputy-card-value">{fmt(dep.total_gasto)}</div>
      <div className="deputy-card-sub">{fmtN(dep.num_transacoes)} transações</div>
    </div>
  );
}
