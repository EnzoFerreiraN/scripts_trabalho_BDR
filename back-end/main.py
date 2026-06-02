from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import q1_gastos, q2_eixo_atuacao, q3_votacao_tema, q4_escolaridade, q5_fornecedores, q6_correlacao, q7_influencia

app = FastAPI(title="Câmara dos Deputados API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
