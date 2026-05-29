import sqlite3
conn = sqlite3.connect("camara-2023-2026.db")
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM gasto WHERE txtDescricao IS NULL")
print("gasto NULL txtDescricao:", cur.fetchone()[0])

cur.execute("SELECT COUNT(*) FROM gasto WHERE vlrLiquido > 0 AND txtCNPJCPF IS NULL")
print("gasto NULL cnpj (vlrLiquido>0):", cur.fetchone()[0])

cur.execute("SELECT DISTINCT voto FROM voto")
print("distinct votos:", [r[0] for r in cur.fetchall()])

cur.execute("SELECT COUNT(*) FROM voto WHERE voto IS NULL")
print("NULL voto rows:", cur.fetchone()[0])

conn.close()
