from fastapi import APIRouter
from database import get_connection
from schemas import EscolaridadeDistribuicao

router = APIRouter()

# Usa vw_escolaridade_norm (5 buckets ordinais) e vw_deputado_atual
# (844 deputados com gastos 2023-2026). Ordenado por escolaridade_ord (0→4).
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


@router.get("/escolaridade", response_model=list[EscolaridadeDistribuicao])
def escolaridade():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]
