#!/usr/bin/env sh
set -e

DB_TARGET="${DB_PATH:-/data/camara-2023-2026.db}"
DB_DIR="$(dirname 1"$DB_TARGET")"
SEED_FILE="/seed/camara-2023-2026.db"

# Garante que o diretório do volume existe
mkdir -p "$DB_DIR"

# Copia o banco do seed para o volume persistente na primeira execução
if [ ! -f "$DB_TARGET" ]; then
    echo "[entrypoint] Banco não encontrado em '$DB_TARGET'. Iniciando cópia do seed..."
    cp "$SEED_FILE" "$DB_TARGET"
    echo "[entrypoint] Banco copiado com sucesso ($(du -sh "$DB_TARGET" | cut -f1))."
else
    echo "[entrypoint] Banco já existe em '$DB_TARGET'. Cópia desnecessária."
fi

echo "[entrypoint] Iniciando uvicorn em 0.0.0.0:${PORT:-8000} ..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
