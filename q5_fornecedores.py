"""
Pergunta 5: Ordenar fornecedores por valores totais recebidos (vlrLiquido).
"""

import sqlite3

DB = "camara-2023-2026.db"

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
LIMIT 50;
"""

def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute(SQL)
    rows = cur.fetchall()
    conn.close()

    print(f"{'#':>3}  {'Fornecedor':<45} {'CNPJ/CPF':<20} {'Categoria':<30} "
          f"{'Transações':>10} {'Deputados':>10} {'Total (R$)':>16} {'Ticket Médio':>14}")
    print("-" * 155)
    for i, (forn, cnpj, cat, n_trans, n_dep, total, ticket) in enumerate(rows, 1):
        print(
            f"{i:>3}  {forn[:44]:<45} {cnpj:<20} {(cat or '—')[:29]:<30} "
            f"{n_trans:>10,} {n_dep:>10,} {total:>16,.2f} {ticket:>14,.2f}"
        )

if __name__ == "__main__":
    main()
