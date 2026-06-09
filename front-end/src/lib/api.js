export async function apiFetch(path) {
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
  return r.json();
}
