from fastapi import APIRouter, Query
from database import get_connection
from schemas import Influencia

router = APIRouter()

SQL = """
WITH plen_aprovadas AS (
    SELECT DISTINCT p.proposicao_id
    FROM pauta p
    JOIN votacao v ON v.id = p.idVotacao
    WHERE v.siglaOrgao = 'PLEN'
      AND v.aprovacao  = 1
),
total AS (
    SELECT COUNT(*) AS total_aprovadas FROM plen_aprovadas
),
dep_aprovadas AS (
    SELECT
        a.idDeputadoAutor                   AS dep_id,
        COUNT(DISTINCT a.idProposicao)      AS aprovadas_pelo_dep
    FROM autoria a
    JOIN plen_aprovadas pa ON pa.proposicao_id = a.idProposicao
    WHERE a.idDeputadoAutor IS NOT NULL
    GROUP BY a.idDeputadoAutor
),
dep_pauta AS (
    SELECT
        a.idDeputadoAutor                   AS dep_id,
        COUNT(DISTINCT p.proposicao_id)     AS em_pauta_plen
    FROM autoria a
    JOIN pauta p    ON p.proposicao_id = a.idProposicao
    JOIN votacao v  ON v.id = p.idVotacao
    WHERE a.idDeputadoAutor IS NOT NULL
      AND v.siglaOrgao = 'PLEN'
    GROUP BY a.idDeputadoAutor
),
dep_partido AS (
    SELECT deputado_id, deputado_siglaPartido AS partido, deputado_siglaUf AS uf
    FROM voto
    WHERE (deputado_id, dataHoraVoto) IN (
        SELECT deputado_id, MAX(dataHoraVoto)
        FROM voto
        GROUP BY deputado_id
    )
)
SELECT
    d.nome,
    d.urlFoto,
    COALESCE(pp.partido, '?')               AS partido,
    COALESCE(pp.uf, '?')                    AS uf,
    COALESCE(dp.em_pauta_plen, 0)           AS em_pauta_plen,
    COALESCE(da.aprovadas_pelo_dep, 0)      AS aprovadas_pelo_dep,
    ROUND(
        100.0 * COALESCE(da.aprovadas_pelo_dep, 0)
              / NULLIF(COALESCE(dp.em_pauta_plen, 0), 0),
        1
    )                                        AS taxa_aprovacao,
    t.total_aprovadas,
    ROUND(
        100.0 * COALESCE(da.aprovadas_pelo_dep, 0) / t.total_aprovadas,
        2
    )                                        AS pct_influencia
FROM deputado d
LEFT JOIN dep_aprovadas da ON da.dep_id = d.id
LEFT JOIN dep_pauta     dp ON dp.dep_id = d.id
LEFT JOIN dep_partido   pp ON pp.deputado_id = d.id
CROSS JOIN total t
WHERE COALESCE(da.aprovadas_pelo_dep, 0) > 0
ORDER BY pct_influencia DESC
LIMIT :limit;
"""


@router.get("/influencia", response_model=list[Influencia])
def influencia(limit: int = Query(default=30, ge=1, le=513)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL, {"limit": limit})
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]
