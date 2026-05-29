from fastapi import APIRouter, Query
from database import get_connection
from schemas import GastoDeputado

router = APIRouter()

SQL = """
SELECT
    d.nome,
    d.id,
    d.urlFoto,
    g.sgPartido                           AS partido,
    g.sgUF                                AS uf,
    COUNT(g.ideDocumento)                 AS num_transacoes,
    ROUND(SUM(g.vlrLiquido), 2)           AS total_gasto
FROM deputado d
JOIN gasto g ON g.idDeCadastro = d.id
GROUP BY d.id, d.nome, d.urlFoto, g.sgPartido, g.sgUF
ORDER BY total_gasto DESC
LIMIT :limit;
"""


@router.get("/gastos-deputados", response_model=list[GastoDeputado])
def gastos_deputados(limit: int = Query(default=50, ge=1, le=513)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL, {"limit": limit})
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]
