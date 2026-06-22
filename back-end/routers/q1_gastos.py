from fastapi import APIRouter, Query

import cache
from database import get_connection
from schemas import GastoDeputado, GastoDetalhe, DeputadoBasico, GastoPartido, GastoCategoriaPartido

router = APIRouter()

# Lista leve para o autocomplete de busca.
SQL_DEPUTADOS = """
SELECT d.id, d.nome, d.urlFoto
FROM vw_gasto_deputado g
JOIN deputado d ON d.id = g.id
ORDER BY d.nome;
"""

# Uma linha por deputado via vw_gasto_deputado (ver views.py).
# Usado quando não há filtro por partido/ano — preserva a performance e
# o comportamento original.
SQL = """
SELECT d.nome, g.id, d.urlFoto, g.partido, g.uf, g.num_transacoes, g.total_gasto
FROM vw_gasto_deputado g
JOIN deputado d ON d.id = g.id
ORDER BY g.total_gasto DESC
{limit_clause};
"""

# Usado quando há filtro por partido e/ou ano: agrega direto da tabela `gasto`
# com WHERE parametrizado e janela de "transação mais recente dentro do filtro".
SQL_FILTRADO = """
WITH filtrado AS (
    SELECT idDeCadastro AS id, sgPartido, sgUF, numAno, numMes, ideDocumento, vlrLiquido
    FROM gasto
    WHERE vlrLiquido > 0
      {ano_clause}
      {partido_clause}
),
agg AS (
    SELECT id, COUNT(*) AS num_transacoes, ROUND(SUM(vlrLiquido), 2) AS total_gasto
    FROM filtrado
    GROUP BY id
),
recente AS (
    SELECT id, sgPartido, sgUF,
           ROW_NUMBER() OVER (
               PARTITION BY id
               ORDER BY numAno DESC, numMes DESC, ideDocumento DESC
           ) AS rn
    FROM filtrado
)
SELECT d.nome, a.id, d.urlFoto, r.sgPartido AS partido, r.sgUF AS uf,
       a.num_transacoes, a.total_gasto
FROM agg a
JOIN deputado d ON d.id = a.id
JOIN recente r  ON r.id = a.id AND r.rn = 1
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

SQL_FILTROS = """
SELECT DISTINCT sgPartido AS partido FROM gasto
WHERE sgPartido IS NOT NULL AND sgPartido != ''
ORDER BY sgPartido;
"""

SQL_ANOS = """
SELECT DISTINCT numAno AS ano FROM gasto
ORDER BY numAno;
"""

# Gasto total por partido entre TODOS os deputados (com filtro de ano opcional).
SQL_GASTOS_POR_PARTIDO = """
SELECT sgPartido                       AS partido,
       COUNT(DISTINCT idDeCadastro)    AS num_deputados,
       ROUND(SUM(vlrLiquido), 2)       AS total_gasto
FROM gasto
WHERE vlrLiquido > 0
  AND sgPartido IS NOT NULL AND sgPartido != ''
  {ano_clause}
GROUP BY sgPartido
ORDER BY total_gasto DESC;
"""

# Gasto de um partido específico, dividido por categoria de despesa (com filtro de ano opcional).
SQL_GASTOS_CATEGORIA_PARTIDO = """
SELECT txtDescricao              AS categoria,
       COUNT(*)                  AS num_transacoes,
       ROUND(SUM(vlrLiquido), 2) AS total
FROM gasto
WHERE sgPartido = :partido
  AND vlrLiquido > 0
  {ano_clause}
GROUP BY txtDescricao
ORDER BY total DESC;
"""


# ── helpers de cálculo ──────────────────────────────────────────────────────

def _get_deputados() -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL_DEPUTADOS)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def _get_filtros() -> dict:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL_FILTROS)
    partidos = [r["partido"] for r in cur.fetchall()]
    cur.execute(SQL_ANOS)
    anos = [r["ano"] for r in cur.fetchall()]
    conn.close()
    return {"partidos": partidos, "anos": anos}


def _gastos_deputados(limit: int | None, partido: str | None, ano: int | None) -> list[dict]:
    params: dict = {}

    if partido is None and ano is None:
        if limit is None:
            sql = SQL.format(limit_clause="")
        else:
            sql = SQL.format(limit_clause="LIMIT :limit")
            params["limit"] = limit
    else:
        ano_clause = ""
        partido_clause = ""
        if ano is not None:
            ano_clause = "AND numAno = :ano"
            params["ano"] = ano
        if partido is not None:
            partido_clause = "AND sgPartido = :partido"
            params["partido"] = partido

        limit_clause = ""
        if limit is not None:
            limit_clause = "LIMIT :limit"
            params["limit"] = limit

        sql = SQL_FILTRADO.format(
            ano_clause=ano_clause,
            partido_clause=partido_clause,
            limit_clause=limit_clause,
        )

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(sql, params)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def _gastos_por_partido(ano: int | None) -> list[dict]:
    params: dict = {}
    ano_clause = ""
    if ano is not None:
        ano_clause = "AND numAno = :ano"
        params["ano"] = ano
    sql = SQL_GASTOS_POR_PARTIDO.format(ano_clause=ano_clause)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(sql, params)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── endpoints ──────────────────────────────────────────────────────────────

@router.get("/deputados", response_model=list[DeputadoBasico])
def listar_deputados():
    return cache.get_or_compute("q1:deputados", _get_deputados, ttl=cache.STATIC_TTL)


@router.get("/filtros")
def listar_filtros():
    """Retorna a lista de partidos e anos disponíveis para popular os dropdowns."""
    return cache.get_or_compute("q1:filtros", _get_filtros, ttl=cache.STATIC_TTL)


@router.get("/gastos-deputados", response_model=list[GastoDeputado])
def gastos_deputados(
    limit: int | None = Query(default=None, ge=1),
    partido: str | None = Query(default=None),
    ano: int | None = Query(default=None),
):
    key = f"q1:gastos-deputados:{limit}:{partido or 'all'}:{ano or 'all'}"
    return cache.get_or_compute(
        key,
        lambda: _gastos_deputados(limit, partido, ano),
        ttl=cache.STATIC_TTL,
    )


@router.get("/gastos-por-partido", response_model=list[GastoPartido])
def gastos_por_partido(ano: int | None = Query(default=None)):
    """Gasto total por partido entre todos os deputados. Respeita filtro de ano."""
    key = f"q1:gastos-por-partido:{ano or 'all'}"
    return cache.get_or_compute(key, lambda: _gastos_por_partido(ano), ttl=cache.STATIC_TTL)


@router.get("/gastos-categoria-partido", response_model=list[GastoCategoriaPartido])
def gastos_categoria_partido(
    partido: str = Query(...),
    ano: int | None = Query(default=None),
):
    """Gasto de um partido dividido por categoria de despesa. Respeita filtro de ano."""
    params: dict = {"partido": partido}
    ano_clause = ""
    if ano is not None:
        ano_clause = "AND numAno = :ano"
        params["ano"] = ano
    sql = SQL_GASTOS_CATEGORIA_PARTIDO.format(ano_clause=ano_clause)
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


# Respostas pré-computadas no startup (carga inicial do Q1Tab no front).
# Front pede: /q1/gastos-deputados?limit=100, /q1/deputados, /q1/filtros,
#             /q1/gastos-por-partido (sem ano).
WARMUP = [
    ("q1:gastos-deputados:100:all:all", lambda: _gastos_deputados(100, None, None)),
    ("q1:deputados",                    _get_deputados),
    ("q1:filtros",                      _get_filtros),
    ("q1:gastos-por-partido:all",       lambda: _gastos_por_partido(None)),
]
