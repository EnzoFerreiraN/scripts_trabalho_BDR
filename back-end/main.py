import logging
import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import get_connection
from views import init_views
from routers import q1_gastos, q2_eixo_atuacao, q3_votacao_tema, q4_escolaridade, q5_fornecedores, q6_correlacao, q7_influencia

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("camara-api")

SLOW_REQUEST_SECONDS = 1.0

app = FastAPI(title="Câmara dos Deputados API", version="1.0.0")


@app.on_event("startup")
def startup():
    conn = get_connection()
    init_views(conn)
    conn.close()
    logger.info("Views inicializadas; API pronta.")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Erros não tratados viram 500 JSON consistente em vez de traceback cru."""
    logger.exception("Erro não tratado em %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor.", "path": request.url.path},
    )


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
