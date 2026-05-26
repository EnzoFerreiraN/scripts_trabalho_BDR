"""
Pergunta 4: Agrupar deputados por escolaridade.
"""

import sqlite3

DB = "camara-2023-2026.db"

SQL = """
SELECT
    COALESCE(escolaridade, '(não informado)') AS escolaridade,
    COUNT(*)                                   AS num_deputados,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS pct
FROM deputado
GROUP BY escolaridade
ORDER BY num_deputados DESC;
"""

def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute(SQL)
    rows = cur.fetchall()
    conn.close()

    total = sum(r[1] for r in rows)
    print(f"{'#':>3}  {'Escolaridade':<30} {'Deputados':>10} {'%':>7}")
    print("-" * 55)
    for i, (esc, n, pct) in enumerate(rows, 1):
        print(f"{i:>3}  {esc:<30} {n:>10,} {pct:>6.2f}%")
    print("-" * 55)
    print(f"{'TOTAL':>3}  {'':<30} {total:>10,} {'100.00%':>7}")

if __name__ == "__main__":
    main()
