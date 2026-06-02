import Avatar from '../shared/Avatar';
import Badge from '../shared/Badge';
import { shortName, pct } from '../../lib/formatters';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Podium({ data }) {
  return (
    <div className="podium" style={{ marginBottom: '1.5rem' }}>
      {data.slice(0, 3).map((dep, i) => (
        <div key={dep.nome} className={`podium-card pos-${i + 1}`}>
          <div className="podium-medal">{MEDALS[i]}</div>
          <Avatar urlFoto={dep.urlFoto} nome={dep.nome} size="lg" />
          <div className="podium-name">{shortName(dep.nome)}</div>
          <div className="deputy-card-meta">
            <Badge variant="blue">{dep.partido}</Badge>
            <Badge variant="gray">{dep.uf}</Badge>
          </div>
          <div className="podium-val">{pct(dep.pct_influencia)}</div>
          <div className="podium-sub">de influência no plenário</div>
        </div>
      ))}
    </div>
  );
}
