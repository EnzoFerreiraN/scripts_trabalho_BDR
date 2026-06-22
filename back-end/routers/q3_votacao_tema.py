from fastapi import APIRouter, Query, HTTPException

import cache
from database import get_connection
from schemas import Tema, VotoPorTema, DeputadoBasico

router = APIRouter()

SQL_TEMAS = "SELECT codTema, tema FROM tema ORDER BY tema;"

SQL_DEPUTADOS = """
SELECT DISTINCT d.id, d.nome, d.urlFoto
FROM deputado d
JOIN voto v ON v.deputado_id = d.id
ORDER BY d.nome;
"""

SQL_RESUMO = """
SELECT
    d.nome,
    d.id,
    d.urlFoto,
    t.tema,
    v.voto,
    COUNT(*) AS num_votos,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY d.id, t.codTema), 1) AS pct
FROM voto v
JOIN deputado d      ON d.id           = v.deputado_id
JOIN pauta p         ON p.idVotacao    = v.idVotacao
JOIN classificacao c ON c.idProposicao = p.proposicao_id
JOIN tema t          ON t.codTema      = c.codTema
WHERE d.id   = :dep_id
  AND t.tema LIKE :tema
GROUP BY d.id, t.codTema, v.voto
ORDER BY d.nome, t.tema, num_votos DESC;
"""


def _get_deputados() -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL_DEPUTADOS)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def _get_temas() -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL_TEMAS)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/deputados", response_model=list[DeputadoBasico])
def listar_deputados():
    return cache.get_or_compute("q3:deputados", _get_deputados, ttl=cache.STATIC_TTL)


@router.get("/temas", response_model=list[Tema])
def listar_temas():
    return cache.get_or_compute("q3:temas", _get_temas, ttl=cache.STATIC_TTL)


@router.get("/votos", response_model=list[VotoPorTema])
def votos_por_tema(
    deputado_id: int = Query(..., description="ID numérico do deputado"),
    tema: str = Query(..., description="Parte do nome do tema (busca parcial)"),
):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL_RESUMO, {"dep_id": deputado_id, "tema": f"%{tema}%"})
    rows = cur.fetchall()
    conn.close()
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"Nenhum resultado para deputado_id={deputado_id} e tema='{tema}'.",
        )
    return [dict(r) for r in rows]


# Respostas pré-computadas no startup (front pede ambas no mount).
WARMUP = [
    ("q3:temas",    _get_temas),
    ("q3:deputados", _get_deputados),
]
