from fastapi import APIRouter

import cache
from database import get_connection
from schemas import EscolaridadeDistribuicao

router = APIRouter()

# Usa vw_escolaridade_norm (5 buckets ordinais) e vw_deputado_atual
# (844 deputados com gastos 2023-2026). Ordenado por escolaridade_ord (0→4).
# NÃO alterar — alimenta as correlações da Q6.
SQL = """
SELECT
    en.escolaridade,
    COUNT(*)                                               AS num_deputados,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)    AS pct
FROM vw_escolaridade_norm en
WHERE en.dep_id IN (SELECT id FROM vw_deputado_atual)
GROUP BY en.escolaridade, en.escolaridade_ord
ORDER BY en.escolaridade_ord;
"""

# Valores brutos declarados pelo parlamentar no cadastro da Câmara,
# sem consolidação em buckets ordinais. Ordenado por frequência.
SQL_BRUTA = """
SELECT
    COALESCE(d.escolaridade, 'Sem informação')             AS escolaridade,
    COUNT(*)                                               AS num_deputados,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)    AS pct
FROM deputado d
WHERE d.id IN (SELECT id FROM vw_deputado_atual)
GROUP BY d.escolaridade
ORDER BY num_deputados DESC;
"""


def _get_escolaridade() -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def _get_escolaridade_bruta() -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL_BRUTA)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/escolaridade", response_model=list[EscolaridadeDistribuicao])
def escolaridade():
    return cache.get_or_compute("q4:escolaridade", _get_escolaridade, ttl=cache.STATIC_TTL)


@router.get("/escolaridade-bruta", response_model=list[EscolaridadeDistribuicao])
def escolaridade_bruta():
    """Distribuição pelos valores declarados originais (sem consolidação em
    níveis ordinais). Mesmo conjunto de deputados do endpoint /escolaridade."""
    return cache.get_or_compute("q4:escolaridade-bruta", _get_escolaridade_bruta, ttl=cache.STATIC_TTL)


# Respostas pré-computadas no startup (front pede ambas no mount).
WARMUP = [
    ("q4:escolaridade",       _get_escolaridade),
    ("q4:escolaridade-bruta", _get_escolaridade_bruta),
]
