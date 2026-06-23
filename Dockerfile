# ── Backend Dockerfile ──────────────────────────────────────────────────────
# Build context: raiz do repositório (inclui back-end/ e camara-2023-2026.db)
#
# Ordem das camadas otimizada para cache:
#   1. deps Python (muda raramente)
#   2. DB de 753 MB  (muda raramente → camada fica cacheada entre deploys)
#   3. código back-end (muda com frequência)
#   4. entrypoint (última, menor layer possível)
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# 1 — Dependências Python de runtime
COPY back-end/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 2 — Banco de dados pre-carregado em /seed (copiado para o volume no boot)
COPY camara-2023-2026.db /seed/camara-2023-2026.db

# 3 — Código do backend
COPY back-end/ .

# 4 — Entrypoint: semeia o volume e inicia o uvicorn
COPY back-end/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV DB_PATH=/data/camara-2023-2026.db
EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
