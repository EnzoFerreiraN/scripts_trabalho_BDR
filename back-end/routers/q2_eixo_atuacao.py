from fastapi import APIRouter, Query
from database import get_connection
from schemas import RankingTema, TemaDeputado

router = APIRouter()

SQL_RANKING_TEMAS = """
SELECT
    t.tema,
    COUNT(DISTINCT a.idProposicao) AS num_proposicoes,
    COUNT(DISTINCT a.idDeputadoAutor) AS num_deputados
FROM tema t
JOIN classificacao c ON c.codTema         = t.codTema
JOIN autoria a       ON a.idProposicao    = c.idProposicao
WHERE a.idDeputadoAutor IS NOT NULL
GROUP BY t.codTema, t.tema
ORDER BY num_proposicoes DESC;
"""

SQL_POR_DEPUTADO = """
WITH temas_por_dep AS (
    SELECT
        d.id,
        d.nome,
        t.tema,
        COUNT(*) AS num_proposicoes,
        ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY COUNT(*) DESC) AS rn
    FROM deputado d
    JOIN autoria a        ON a.idDeputadoAutor = d.id
    JOIN classificacao c  ON c.idProposicao    = a.idProposicao
    JOIN tema t           ON t.codTema         = c.codTema
    GROUP BY d.id, d.nome, t.codTema
)
SELECT id, nome, tema, num_proposicoes
FROM temas_por_dep
WHERE rn = 1
ORDER BY num_proposicoes DESC
LIMIT :limit;
"""


@router.get("/ranking-temas", response_model=list[RankingTema])
def ranking_temas():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL_RANKING_TEMAS)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/tema-por-deputado", response_model=list[TemaDeputado])
def tema_por_deputado(limit: int = Query(default=50, ge=1, le=513)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL_POR_DEPUTADO, {"limit": limit})
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]
