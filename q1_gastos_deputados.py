"""
Pergunta 1: Deputados ordenados por gastos totais (vlrLiquido).
"""

import sqlite3

##DB = "camara.db"
DB = "camara-2023-2026.db"

SQL = """
SELECT
    d.nome,
    d.id,
    g.sgPartido                           AS partido,
    g.sgUF                                AS uf,
    COUNT(g.ideDocumento)                 AS num_transacoes,
    ROUND(SUM(g.vlrLiquido), 2)           AS total_gasto
FROM deputado d
JOIN gasto g ON g.idDeCadastro = d.id
GROUP BY d.id, d.nome, g.sgPartido, g.sgUF
ORDER BY total_gasto DESC
LIMIT 50;
"""

def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute(SQL)
    rows = cur.fetchall()
    conn.close()

    header = f"{'#':>3}  {'ID':>8}  {'Nome':<45} {'Partido':<10} {'UF':<4} {'Transações':>10} {'Total (R$)':>15}"
    print(header)
    print("-" * len(header))
    for i, (nome, dep_id, partido, uf, n_trans, total) in enumerate(rows, 1):
        print(f"{i:>3}  {dep_id:>8}  {nome:<45} {partido or '—':<10} {uf or '—':<4} {n_trans:>10,} {total:>15,.2f}")

if __name__ == "__main__":
    main()
