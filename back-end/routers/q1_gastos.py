from fastapi import APIRouter, Query
from database import get_connection
from schemas import GastoDeputado, GastoDetalhe

router = APIRouter()

# Uma linha por deputado: total e nº de transações somam todos os partidos;
# partido/UF vêm da transação mais recente (numAno, numMes, ideDocumento).
SQL = """
WITH agg AS (
    SELECT idDeCadastro AS id,
           COUNT(ideDocumento)        AS num_transacoes,
           ROUND(SUM(vlrLiquido), 2)  AS total_gasto
    FROM gasto
    GROUP BY idDeCadastro
),
recente AS (
    SELECT idDeCadastro AS id, sgPartido, sgUF,
           ROW_NUMBER() OVER (
               PARTITION BY idDeCadastro
               ORDER BY numAno DESC, numMes DESC, ideDocumento DESC
           ) AS rn
    FROM gasto
)
SELECT d.nome, d.id, d.urlFoto,
       r.sgPartido AS partido, r.sgUF AS uf,
       a.num_transacoes, a.total_gasto
FROM agg a
JOIN deputado d ON d.id = a.id
JOIN recente  r ON r.id = a.id AND r.rn = 1
ORDER BY a.total_gasto DESC
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
