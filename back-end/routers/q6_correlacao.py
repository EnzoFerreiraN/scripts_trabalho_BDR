from fastapi import APIRouter
from database import get_connection
from schemas import (
    CorrelacaoGastos,
    CorrelacaoFidelidade,
    CorrelacaoProposicoes,
    CorrelacaoPresenca,
    CorrelacaoPresencaPlenario,
)

router = APIRouter()

SQL_6A = """
SELECT
    d.escolaridade,
    COUNT(DISTINCT d.id)                                        AS num_deputados,
    ROUND(SUM(g.vlrLiquido), 2)                                 AS total_gasto,
    ROUND(SUM(g.vlrLiquido) / COUNT(DISTINCT d.id), 2)         AS media_gasto_por_deputado,
    ROUND(AVG(g.vlrLiquido), 2)                                 AS media_por_transacao
FROM deputado d
JOIN gasto g ON g.idDeCadastro = d.id
WHERE d.escolaridade IS NOT NULL
GROUP BY d.escolaridade
ORDER BY media_gasto_por_deputado DESC;
"""

SQL_6B = """
SELECT
    d.escolaridade,
    COUNT(DISTINCT d.id)                                                AS num_deputados,
    COUNT(*)                                                            AS votos_com_orientacao,
    SUM(CASE WHEN v.voto = o.orientacao THEN 1 ELSE 0 END)             AS votos_fieis,
    ROUND(
        100.0 * SUM(CASE WHEN v.voto = o.orientacao THEN 1 ELSE 0 END)
              / COUNT(*),
        2
    )                                                                   AS pct_fidelidade
FROM voto v
JOIN deputado d  ON d.id           = v.deputado_id
JOIN orientacao o ON o.idVotacao   = v.idVotacao
                 AND o.siglaBancada = v.deputado_siglaPartido
WHERE d.escolaridade    IS NOT NULL
  AND o.orientacao      IS NOT NULL
  AND o.orientacao      != 'Liberado'
  AND v.voto            IS NOT NULL
  AND d.id IN (SELECT DISTINCT idDeCadastro FROM gasto)
GROUP BY d.escolaridade
ORDER BY pct_fidelidade DESC;
"""

SQL_6C = """
SELECT
    d.escolaridade,
    COUNT(DISTINCT d.id)                                              AS num_deputados,
    COUNT(a.idProposicao)                                             AS total_proposicoes,
    ROUND(1.0 * COUNT(a.idProposicao) / COUNT(DISTINCT d.id), 1)     AS media_por_deputado
FROM deputado d
LEFT JOIN autoria a ON a.idDeputadoAutor = d.id
WHERE d.escolaridade IS NOT NULL
  AND d.id IN (SELECT DISTINCT idDeCadastro FROM gasto)
GROUP BY d.escolaridade
ORDER BY media_por_deputado DESC;
"""

SQL_6D = """
SELECT
    d.escolaridade,
    COUNT(DISTINCT d.id)                                            AS num_deputados,
    COUNT(p.idEvento)                                               AS total_presencas,
    ROUND(1.0 * COUNT(p.idEvento) / COUNT(DISTINCT d.id), 1)       AS media_por_deputado
FROM deputado d
LEFT JOIN presenca p ON p.idDeputado = d.id
WHERE d.escolaridade IS NOT NULL
  AND d.id IN (SELECT DISTINCT idDeCadastro FROM gasto)
GROUP BY d.escolaridade
ORDER BY media_por_deputado DESC;
"""

SQL_6E = """
SELECT
    d.escolaridade,
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
WHERE d.escolaridade IS NOT NULL
  AND d.id IN (SELECT DISTINCT idDeCadastro FROM gasto)
GROUP BY d.escolaridade
ORDER BY media_por_deputado DESC;
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
