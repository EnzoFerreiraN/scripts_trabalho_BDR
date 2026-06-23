import logging
import os
import sqlite3
from pathlib import Path

logger = logging.getLogger("camara-api.database")

DB_PATH = Path(
    os.getenv("DB_PATH", str(Path(__file__).parent.parent / "camara-2023-2026.db"))
)


def database_exists() -> bool:
    """Verifica se o arquivo do banco de dados está presente."""
    return DB_PATH.is_file()


def get_connection(readonly: bool = True) -> sqlite3.Connection:
    """Retorna uma conexão SQLite.

    Por padrão abre em modo somente leitura (readonly=True).
    Use readonly=False apenas para operações de escrita no startup (criar views).
    """
    if not database_exists():
        logger.error(
            "Banco de dados não encontrado em '%s'. "
            "Verifique se o volume está montado e o arquivo foi copiado para /data.",
            DB_PATH,
        )
        raise FileNotFoundError(f"Banco de dados não encontrado em: {DB_PATH}")

    if readonly:
        uri = f"file:{DB_PATH}?mode=ro"
        conn = sqlite3.connect(uri, uri=True)
    else:
        conn = sqlite3.connect(str(DB_PATH))

    # Limites de memória por conexão — crítico em containers com pouca RAM
    # (banco de 719 MB > 512 MB de limite do plano Railway).
    conn.execute("PRAGMA mmap_size=0")       # desativa memory-map do arquivo inteiro
    conn.execute("PRAGMA cache_size=-4000")  # ~4 MB de cache de páginas por conexão
    conn.execute("PRAGMA temp_store=FILE")   # resultados temporários em disco, não RAM

    conn.row_factory = sqlite3.Row
    return conn
