from fastapi import APIRouter, Query
from database import get_connection
from schemas import GastoDeputado, GastoDetalhe, DeputadoBasico

router = APIRouter()

# Lista leve para o autocomplete de busca.
SQL_DEPUTADOS = """
SELECT d.id, d.nome, d.urlFoto
FROM vw_gasto_deputado g
JOIN deputado d ON d.id = g.id
ORDER BY d.nome;
"""

# Uma linha por deputado via vw_gasto_deputado (ver views.py).
SQL = """
SELECT d.nome, g.id, d.urlFoto, g.partido, g.uf, g.num_transacoes, g.total_gasto
FROM vw_gasto_deputado g
JOIN deputado d ON d.id = g.id
ORDER BY g.total_gasto DESC
{limit_clause};
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


@router.get("/deputados", response_model=list[DeputadoBasico])
def listar_deputados():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL_DEPUTADOS)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/gastos-deputados", response_model=list[GastoDeputado])
def gastos_deputados(limit: int | None = Query(default=None, ge=1)):
    params: dict = {}
    if limit is None:
        sql = SQL.format(limit_clause="")
    else:
        sql = SQL.format(limit_clause="LIMIT :limit")
        params["limit"] = limit
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(sql, params)
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
