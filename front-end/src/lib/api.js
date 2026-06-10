// Cache em memória por path (TTL 5min): os dados da legislatura são
// estáticos, então trocar de aba e voltar não precisa refazer o fetch.
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map(); // path -> { ts, data }

export async function apiFetch(path) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;

  let r;
  try {
    r = await fetch(path);
  } catch (err) {
    // Network/connection failure — fetch rejects before any HTTP response.
    console.error('[api] falha de conexão:', err);
    throw new Error('Não foi possível conectar ao servidor de dados. Tente novamente.');
  }
  if (!r.ok) {
    throw new Error(`O servidor respondeu com erro (HTTP ${r.status}). Tente novamente em instantes.`);
  }
  const data = await r.json();
  cache.set(path, { ts: Date.now(), data });
  return data;
}
