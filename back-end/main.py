import logging
import os
import time
import threading

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import cache
from database import get_connection, database_exists, DB_PATH
from views import init_views
from routers import q1_gastos, q2_eixo_atuacao, q3_votacao_tema, q4_escolaridade, q5_fornecedores, q6_correlacao, q7_influencia, q8_deputado

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("camara-api")

SLOW_REQUEST_SECONDS = 1.0

app = FastAPI(title="Câmara dos Deputados API", version="1.0.0")


def _run_warmup() -> None:
    """Pré-computa no cache todas as respostas das telas iniciais.
    Roda em background para não atrasar o startup da API."""
    _routers = (
        q1_gastos, q2_eixo_atuacao, q3_votacao_tema, q4_escolaridade,
        q5_fornecedores, q6_correlacao, q7_influencia, q8_deputado,
    )
    tasks = [t for m in _routers for t in getattr(m, "WARMUP", [])]
    logger.info("Warm-up iniciado: %d respostas a pré-computar.", len(tasks))
    start = time.perf_counter()
    for key, fn in tasks:
        try:
            cache.get_or_compute(key, fn, ttl=cache.STATIC_TTL)
            logger.info("  warm-up OK: %s", key)
        except Exception:
            logger.exception("  warm-up FALHOU: %s", key)
    elapsed = time.perf_counter() - start
    logger.info("Warm-up concluído: %d respostas em %.1fs.", len(tasks), elapsed)


@app.on_event("startup")
def startup():
    if not database_exists():
        logger.error(
            "CRÍTICO: Banco de dados não encontrado em '%s'. "
            "Verifique se o volume está montado corretamente e o arquivo foi copiado para /data.",
            DB_PATH,
        )
        return
    conn = get_connection(readonly=False)
    init_views(conn)
    conn.close()
    threading.Thread(target=_run_warmup, daemon=True, name="cache-warmup").start()
    logger.info("Views inicializadas; API pronta (warm-up em background).")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Erros não tratados viram 500 JSON consistente em vez de traceback cru."""
    logger.exception("Erro não tratado em %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor.", "path": request.url.path},
    )


@app.get("/health", tags=["Health"])
def health():
    """Health check leve: verifica apenas se o banco de dados existe no volume."""
    if not database_exists():
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "detail": f"Banco não encontrado em {DB_PATH}",
            },
        )
    return {"status": "ok", "db": str(DB_PATH)}


@app.middleware("http")
async def log_slow_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = time.perf_counter() - start
    if elapsed > SLOW_REQUEST_SECONDS:
        logger.warning("Request lenta: %s %s levou %.2fs", request.method, request.url.path, elapsed)
    return response


# Em dev o front roda em http://localhost:5173 (Vite). Outras origens podem
# ser liberadas via env var: CORS_ORIGINS="http://a.com,http://b.com"
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(q1_gastos.router,       prefix="/q1", tags=["Q1 - Gastos"])
app.include_router(q2_eixo_atuacao.router, prefix="/q2", tags=["Q2 - Eixo de Atuação"])
app.include_router(q3_votacao_tema.router, prefix="/q3", tags=["Q3 - Votação por Tema"])
app.include_router(q4_escolaridade.router, prefix="/q4", tags=["Q4 - Escolaridade"])
app.include_router(q5_fornecedores.router, prefix="/q5", tags=["Q5 - Fornecedores"])
app.include_router(q6_correlacao.router,   prefix="/q6", tags=["Q6 - Correlação Escolaridade"])
app.include_router(q7_influencia.router,   prefix="/q7", tags=["Q7 - Influência"])
app.include_router(q8_deputado.router,     prefix="/q8", tags=["Q8 - Visão Geral do Deputado"])
