from fastapi import APIRouter
from database import get_connection
from schemas import (
    CorrelacaoGastos,
    CorrelacaoFidelidade,
    CorrelacaoProposicoes,
    CorrelacaoPresenca,
    CorrelacaoPresencaPlenario,
    DadosDeputadoCorrelacao,
)

router = APIRouter()

# Todas as queries usam vw_escolaridade_norm (5 buckets ordinais) e
# vw_deputado_atual (844 deputados com gastos 2023-2026).
# escolaridade_ord > 0 exclui "Sem informação" das correlações.
# ORDER BY escolaridade_ord garante eixo ordinal nos gráficos.

SQL_6A = """
SELECT
    en.escolaridade,
    COUNT(DISTINCT d.id)                                         AS num_deputados,
    ROUND(SUM(g.vlrLiquido), 2)                                  AS total_gasto,
    ROUND(SUM(g.vlrLiquido) / COUNT(DISTINCT d.id), 2)          AS media_gasto_por_deputado,
    ROUND(AVG(g.vlrLiquido), 2)                                  AS media_por_transacao
FROM deputado d
JOIN gasto g ON g.idDeCadastro = d.id
JOIN vw_escolaridade_norm en ON en.dep_id = d.id
WHERE en.escolaridade_ord > 0
GROUP BY en.escolaridade, en.escolaridade_ord
ORDER BY en.escolaridade_ord;
"""

SQL_6B = """
SELECT
    en.escolaridade,
    COUNT(DISTINCT d.id)                                                AS num_deputados,
    COUNT(*)                                                            AS votos_com_orientacao,
    SUM(CASE WHEN v.voto = o.orientacao THEN 1 ELSE 0 END)             AS votos_fieis,
    ROUND(
        100.0 * SUM(CASE WHEN v.voto = o.orientacao THEN 1 ELSE 0 END)
              / COUNT(*),
        2
    )                                                                   AS pct_fidelidade
FROM voto v
JOIN deputado d   ON d.id            = v.deputado_id
JOIN orientacao o ON o.idVotacao     = v.idVotacao
                 AND o.siglaBancada  = v.deputado_siglaPartido
JOIN vw_escolaridade_norm en ON en.dep_id = d.id
WHERE en.escolaridade_ord    > 0
  AND d.id IN (SELECT id FROM vw_deputado_atual)
  AND o.orientacao      IS NOT NULL
  AND o.orientacao      != 'Liberado'
  AND v.voto            IS NOT NULL
GROUP BY en.escolaridade, en.escolaridade_ord
ORDER BY en.escolaridade_ord;
"""

SQL_6C = """
SELECT
    en.escolaridade,
    COUNT(DISTINCT d.id)                                              AS num_deputados,
    COUNT(a.idProposicao)                                             AS total_proposicoes,
    ROUND(1.0 * COUNT(a.idProposicao) / COUNT(DISTINCT d.id), 1)     AS media_por_deputado
FROM deputado d
LEFT JOIN autoria a ON a.idDeputadoAutor = d.id
JOIN vw_escolaridade_norm en ON en.dep_id = d.id
WHERE en.escolaridade_ord > 0
  AND d.id IN (SELECT id FROM vw_deputado_atual)
GROUP BY en.escolaridade, en.escolaridade_ord
ORDER BY en.escolaridade_ord;
"""

SQL_6D = """
SELECT
    en.escolaridade,
    COUNT(DISTINCT d.id)                                            AS num_deputados,
    COUNT(p.idEvento)                                               AS total_presencas,
    ROUND(1.0 * COUNT(p.idEvento) / COUNT(DISTINCT d.id), 1)       AS media_por_deputado
FROM deputado d
LEFT JOIN presenca p ON p.idDeputado = d.id
JOIN vw_escolaridade_norm en ON en.dep_id = d.id
WHERE en.escolaridade_ord > 0
  AND d.id IN (SELECT id FROM vw_deputado_atual)
GROUP BY en.escolaridade, en.escolaridade_ord
ORDER BY en.escolaridade_ord;
"""

SQL_6E = """
SELECT
    en.escolaridade,
    COUNT(DISTINCT d.id)                                               AS num_deputados,
    COUNT(pp.idEvento)                                                 AS total_presencas_plenario,
    ROUND(1.0 * COUNT(pp.idEvento) / COUNT(DISTINCT d.id), 1)         AS media_por_deputado
FROM deputado d
LEFT JOIN (
    SELECT p.idDeputado, p.idEvento
    FROM presenca p
    JOIN evento e ON e.id = p.idEvento
    WHERE e.descricaoTipo = 'Sessão Deliberativa'
) pp ON pp.idDeputado = d.id
JOIN vw_escolaridade_norm en ON en.dep_id = d.id
WHERE en.escolaridade_ord > 0
  AND d.id IN (SELECT id FROM vw_deputado_atual)
GROUP BY en.escolaridade, en.escolaridade_ord
ORDER BY en.escolaridade_ord;
"""


SQL_DADOS_DEPUTADO = """
WITH gasto_dep AS (
    SELECT idDeCadastro AS dep_id,
           ROUND(SUM(vlrLiquido), 2) AS total_gasto
    FROM gasto
    WHERE vlrLiquido > 0
    GROUP BY idDeCadastro
),
fid_dep AS (
    SELECT v.deputado_id,
           ROUND(100.0 * SUM(CASE WHEN v.voto = o.orientacao THEN 1 ELSE 0 END)
                       / COUNT(*), 2) AS pct_fidelidade
    FROM voto v
    JOIN orientacao o ON o.idVotacao      = v.idVotacao
                     AND o.siglaBancada  = v.deputado_siglaPartido
    WHERE o.orientacao IS NOT NULL
      AND o.orientacao != 'Liberado'
      AND v.voto       IS NOT NULL
    GROUP BY v.deputado_id
),
prop_dep AS (
    SELECT idDeputadoAutor AS dep_id,
           COUNT(idProposicao) AS num_proposicoes
    FROM autoria
    WHERE idDeputadoAutor IS NOT NULL
    GROUP BY idDeputadoAutor
),
pres_dep AS (
    SELECT p.idDeputado AS dep_id,
           COUNT(p.idEvento) AS num_presencas
    FROM presenca p
    JOIN evento e ON e.id = p.idEvento
    WHERE e.descricaoTipo = 'Sessão Deliberativa'
    GROUP BY p.idDeputado
)
SELECT
    d.id                                      AS dep_id,
    en.escolaridade,
    en.escolaridade_ord,
    COALESCE(g.total_gasto, 0)                AS total_gasto,
    f.pct_fidelidade,
    COALESCE(pr.num_proposicoes, 0)           AS num_proposicoes,
    COALESCE(ps.num_presencas, 0)             AS num_presencas
FROM deputado d
JOIN vw_escolaridade_norm en ON en.dep_id    = d.id
LEFT JOIN gasto_dep g        ON g.dep_id     = d.id
LEFT JOIN fid_dep f          ON f.deputado_id = d.id
LEFT JOIN prop_dep pr        ON pr.dep_id    = d.id
LEFT JOIN pres_dep ps        ON ps.dep_id    = d.id
WHERE en.escolaridade_ord > 0
  AND d.id IN (SELECT id FROM vw_deputado_atual)
ORDER BY d.id;
"""


def _query(sql: str) -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(sql)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/gastos", response_model=list[CorrelacaoGastos])
def correlacao_gastos():
    return _query(SQL_6A)


@router.get("/fidelidade-partidaria", response_model=list[CorrelacaoFidelidade])
def correlacao_fidelidade():
    return _query(SQL_6B)


@router.get("/proposicoes", response_model=list[CorrelacaoProposicoes])
def correlacao_proposicoes():
    return _query(SQL_6C)


@router.get("/presenca-eventos", response_model=list[CorrelacaoPresenca])
def correlacao_presenca_eventos():
    return _query(SQL_6D)


@router.get("/presenca-plenario", response_model=list[CorrelacaoPresencaPlenario])
def correlacao_presenca_plenario():
    return _query(SQL_6E)


@router.get("/dados-deputado", response_model=list[DadosDeputadoCorrelacao])
def dados_deputado():
    return _query(SQL_DADOS_DEPUTADO)
