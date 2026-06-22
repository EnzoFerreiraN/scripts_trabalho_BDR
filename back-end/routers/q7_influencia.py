from fastapi import APIRouter, Query

import cache
from database import get_connection
from schemas import Influencia, ProposicaoInfluencia

router = APIRouter()

# vw_influencia (ver views.py) pondera autoria por ordemAssinatura/proponente
# e pela margem de aprovação (votosSim/total), depois normaliza 0-100.
SQL = """
SELECT id, nome, urlFoto, partido, uf,
       em_pauta_plen, aprovadas_pelo_dep, taxa_aprovacao,
       total_aprovadas, score_ponderado, pct_influencia
FROM vw_influencia
ORDER BY pct_influencia DESC
LIMIT :limit;
"""

# Proposições aprovadas no plenário que contribuíram para o score de um deputado.
# Replica exatamente o grão dos CTEs plen_aprovadas + dep_score da vw_influencia:
#   - plen_aprovadas: DISTINCT proposicao_id + margem (igual à view)
#   - prop_info: campos de exibição via GROUP BY sobre pauta (sem depender da tabela
#     proposicao, que omite registros antigos e causaria diferença no total)
# contribuicao não é arredondada por linha para que SUM(contribuicao) no front
# bata com ROUND(SUM(...), 3) da view sem deriva de arredondamento acumulado.
SQL_PROPOSICOES_INFLUENCIA = """
WITH plen_aprovadas AS (
    SELECT DISTINCT p.proposicao_id,
           COALESCE(
               ROUND(1.0 * v.votosSim / NULLIF(v.votosSim + v.votosNao, 0), 3),
               0.5
           ) AS margem
    FROM pauta p
    JOIN votacao v ON v.id = p.idVotacao
    WHERE v.siglaOrgao = 'PLEN' AND v.aprovacao = 1
),
prop_info AS (
    SELECT proposicao_id,
           MAX(proposicao_siglaTipo)                          AS siglaTipo,
           MAX(proposicao_numero)                             AS numero,
           MAX(proposicao_ano)                                AS ano,
           MAX(COALESCE(proposicao_ementa, proposicao_titulo)) AS ementa
    FROM pauta
    GROUP BY proposicao_id
)
SELECT a.idProposicao AS id,
       pi.siglaTipo,
       pi.numero,
       pi.ano,
       pi.ementa,
       a.ordemAssinatura,
       a.proponente,
       CASE WHEN a.ordemAssinatura <= 1 OR a.proponente = 1
            THEN 1.0
            ELSE 1.0 / a.ordemAssinatura
       END AS peso,
       pa.margem,
       (CASE WHEN a.ordemAssinatura <= 1 OR a.proponente = 1
             THEN 1.0
             ELSE 1.0 / a.ordemAssinatura END) * pa.margem AS contribuicao
FROM autoria a
JOIN plen_aprovadas  pa ON pa.proposicao_id = a.idProposicao
LEFT JOIN prop_info  pi ON pi.proposicao_id = a.idProposicao
WHERE a.idDeputadoAutor = :id
ORDER BY contribuicao DESC;
"""


def _influencia(limit: int) -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL, {"limit": limit})
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def _proposicoes_influencia(deputado_id: int) -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL_PROPOSICOES_INFLUENCIA, {"id": deputado_id})
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/influencia", response_model=list[Influencia])
def influencia(limit: int = Query(default=50, ge=1, le=513)):
    return cache.get_or_compute(
        f"q7:influencia:{limit}",
        lambda: _influencia(limit),
        ttl=cache.STATIC_TTL,
    )


@router.get("/proposicoes-influencia/{deputado_id}", response_model=list[ProposicaoInfluencia])
def proposicoes_influencia(deputado_id: int):
    """Lista as proposições aprovadas no plenário que compõem o score de influência do deputado."""
    return cache.get_or_compute(
        f"q7:proposicoes:{deputado_id}",
        lambda: _proposicoes_influencia(deputado_id),
        ttl=cache.STATIC_TTL,
    )


# Respostas pré-computadas no startup (front pede /q7/influencia?limit=200).
WARMUP = [
    ("q7:influencia:200", lambda: _influencia(200)),
]
