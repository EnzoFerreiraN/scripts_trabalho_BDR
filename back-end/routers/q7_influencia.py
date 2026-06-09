from fastapi import APIRouter, Query
from database import get_connection
from schemas import Influencia

router = APIRouter()

# vw_influencia (ver views.py) pondera autoria por ordemAssinatura/proponente
# e pela margem de aprovação (votosSim/total), depois normaliza 0-100.
SQL = """
SELECT nome, urlFoto, partido, uf,
       em_pauta_plen, aprovadas_pelo_dep, taxa_aprovacao,
       total_aprovadas, score_ponderado, pct_influencia
FROM vw_influencia
ORDER BY pct_influencia DESC
LIMIT :limit;
"""


@router.get("/influencia", response_model=list[Influencia])
def influencia(limit: int = Query(default=50, ge=1, le=513)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL, {"limit": limit})
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]
