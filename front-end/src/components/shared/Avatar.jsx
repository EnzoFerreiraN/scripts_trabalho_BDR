import { useState } from 'react';
import { initials } from '../../lib/formatters';

export default function Avatar({ urlFoto, nome, size = 'sm' }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className={`avatar avatar-${size}`}>
      {urlFoto && !imgError
        ? <img src={urlFoto} alt={nome} onError={() => setImgError(true)} />
        : <span>{initials(nome)}</span>
      }
    </div>
  );
}
