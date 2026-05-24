import sqlite3

DB_PATH = "camara.db"
URL_TEMPLATE = "https://www.camara.leg.br/internet/deputado/bandep/{id}.jpg"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("SELECT id FROM deputado WHERE urlFoto IS NULL OR urlFoto = ''")
ids = [row[0] for row in cur.fetchall()]

print(f"{len(ids)} deputados sem foto encontrados.")

for dep_id in ids:
    url = URL_TEMPLATE.format(id=dep_id)
    cur.execute("UPDATE deputado SET urlFoto = ? WHERE id = ?", (url, dep_id))

conn.commit()
conn.close()

print("urlFoto atualizada para todos os deputados.")
