from fastapi import APIRouter, Query
from database import get_connection
from schemas import Fornecedor

router = APIRouter()

SQL = """
SELECT
    txtFornecedor                       AS fornecedor,
    COALESCE(txtCNPJCPF, '—')          AS cnpj_cpf,
    txtDescricao                        AS categoria,
    COUNT(*)                            AS num_transacoes,
    COUNT(DISTINCT idDeCadastro)        AS num_deputados,
    ROUND(SUM(vlrLiquido), 2)           AS total_recebido,
    ROUND(AVG(vlrLiquido), 2)           AS ticket_medio
FROM gasto
WHERE vlrLiquido > 0
GROUP BY txtFornecedor, txtCNPJCPF
ORDER BY total_recebido DESC
LIMIT :limit;
"""


@router.get("/fornecedores", response_model=list[Fornecedor])
def fornecedores(limit: int = Query(default=50, ge=1, le=200)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL, {"limit": limit})
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]
