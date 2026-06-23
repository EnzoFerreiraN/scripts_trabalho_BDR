"""Cache TTL simples em memória, por processo.

Os dados do banco são estáticos (legislatura 2023-2026), então um cache de
módulo evita re-executar as queries pesadas (Q6, ranking de temas, tokenização
das ementas) a cada request. Suficiente para 1 worker do uvicorn.

O _store usa OrderedDict com evicção LRU (maxsize=128) para evitar crescimento
ilimitado — sem isso, navegar por todos os 513 deputados acumula 513 objetos
consolidados por 1h na RAM.
"""
import time
from collections import OrderedDict
from threading import Lock
from typing import Any, Callable

_MAXSIZE = 128  # entradas simultâneas no cache (LRU evicta a mais antiga quando cheio)

_store: OrderedDict[str, tuple[float, Any]] = OrderedDict()
_lock = Lock()

DEFAULT_TTL = 3600        # 1h (padrão genérico)
STATIC_TTL  = 24 * 3600  # 24h — para dados estáticos da legislatura (não mudam em runtime)


def get_or_compute(key: str, fn: Callable[[], Any], ttl: float = DEFAULT_TTL) -> Any:
    """Retorna o valor cacheado para `key`, ou computa via `fn()` e armazena.

    Evicção LRU: quando _store atinge _MAXSIZE, a entrada menos recentemente
    usada é removida antes de inserir uma nova.
    """
    now = time.time()
    with _lock:
        hit = _store.get(key)
        if hit and now - hit[0] < ttl:
            _store.move_to_end(key)  # marca como recentemente usado
            return hit[1]

    value = fn()

    with _lock:
        # Evictar LRU apenas quando for adicionar chave nova
        if key not in _store and len(_store) >= _MAXSIZE:
            _store.popitem(last=False)  # remove a entrada mais antiga (LRU)
        _store[key] = (now, value)
        _store.move_to_end(key)
    return value


def clear() -> None:
    with _lock:
        _store.clear()
