from fastapi import APIRouter
from database import get_connection
from schemas import EscolaridadeDistribuicao

router = APIRouter()

SQL = """
SELECT
    COALESCE(escolaridade, '(não informado)')   AS escolaridade,
    COUNT(*)                                    AS num_deputados,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM deputado
WHERE id IN (SELECT DISTINCT idDeCadastro FROM gasto)
GROUP BY escolaridade
ORDER BY num_deputados DESC;
"""


@router.get("/escolaridade", response_model=list[EscolaridadeDistribuicao])
def escolaridade():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]
