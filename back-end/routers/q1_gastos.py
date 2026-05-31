from fastapi import APIRouter, Query
from database import get_connection
from schemas import GastoDeputado, GastoDetalhe

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

SQL_DETALHE = """
SELECT
    txtDescricao                          AS categoria,
    COUNT(*)                              AS num_transacoes,
    ROUND(SUM(vlrLiquido), 2)             AS total,
    ROUND(AVG(vlrLiquido), 2)             AS media,
    txtFornecedor                         AS maior_fornecedor,
    ROUND(MAX(vlrLiquido), 2)             AS maior_valor
FROM gasto
WHERE idDeCadastro = :deputado_id
  AND vlrLiquido > 0
GROUP BY txtDescricao
ORDER BY total DESC;
"""


@router.get("/gastos-deputados", response_model=list[GastoDeputado])
def gastos_deputados(limit: int = Query(default=50, ge=1, le=513)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL, {"limit": limit})
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/gastos-detalhados/{deputado_id}", response_model=list[GastoDetalhe])
def gastos_detalhados(deputado_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL_DETALHE, {"deputado_id": deputado_id})
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]
