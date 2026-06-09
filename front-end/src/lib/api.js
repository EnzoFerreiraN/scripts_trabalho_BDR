export async function apiFetch(path) {
  let r;
  try {
    r = await fetch(path);
  } catch {
    // Network/connection failure — fetch rejects before any HTTP response.
    throw new Error('Não foi possível conectar ao servidor. Verifique se o back-end está rodando em localhost:8000.');
  }
  if (!r.ok) {
    throw new Error(`O servidor respondeu com erro (HTTP ${r.status}). Tente novamente em instantes.`);
  }
  return r.json();
}
