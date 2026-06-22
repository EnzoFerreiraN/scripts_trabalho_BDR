"""Cache TTL simples em memória, por processo.

Os dados do banco são estáticos (legislatura 2023-2026), então um cache de
módulo evita re-executar as queries pesadas (Q6, ranking de temas, tokenização
das ementas) a cada request. Suficiente para 1 worker do uvicorn (uso dev).
"""
import time
from threading import Lock
from typing import Any, Callable

_store: dict[str, tuple[float, Any]] = {}
_lock = Lock()

DEFAULT_TTL = 3600        # 1h (padrão genérico)
STATIC_TTL  = 24 * 3600  # 24h — para dados estáticos da legislatura (não mudam em runtime)


def get_or_compute(key: str, fn: Callable[[], Any], ttl: float = DEFAULT_TTL) -> Any:
    """Retorna o valor cacheado para `key`, ou computa via `fn()` e armazena."""
    now = time.time()
    with _lock:
        hit = _store.get(key)
        if hit and now - hit[0] < ttl:
            return hit[1]
    value = fn()
    with _lock:
        _store[key] = (now, value)
    return value


def clear() -> None:
    with _lock:
        _store.clear()
