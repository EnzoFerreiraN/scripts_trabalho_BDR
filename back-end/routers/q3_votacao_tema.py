from fastapi import APIRouter, Query, HTTPException
from database import get_connection
from schemas import Tema, VotoPorTema

router = APIRouter()

SQL_TEMAS = "SELECT codTema, tema FROM tema ORDER BY tema;"

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


@router.get("/temas", response_model=list[Tema])
def listar_temas():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL_TEMAS)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


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
