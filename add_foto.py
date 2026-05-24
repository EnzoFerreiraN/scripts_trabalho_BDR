import csv
import time
import requests

path = "dados/deputados.csv"

with open(path, encoding="utf-8") as f:
    reader = csv.reader(f, delimiter=";", quotechar='"')
    rows = list(reader)

header = rows[0]
foto_col = header.index("urlFoto")
id_col = header.index("id")

total = len(rows) - 1

for i, row in enumerate(rows[1:], start=1):
    deputy_id = row[id_col]
    url = f"https://dadosabertos.camara.leg.br/api/v2/deputados/{deputy_id}"

    try:
        resp = requests.get(url, headers={"accept": "application/json"}, timeout=15)
        resp.raise_for_status()
        data = resp.json().get("dados", {})
        url_foto = data.get("ultimoStatus", {}).get("urlFoto") or ""
    except Exception as e:
        print(f"[{i}/{total}] Erro no deputado {deputy_id}: {e}")
        url_foto = ""

    row[foto_col] = url_foto
    print(f"[{i}/{total}] {row[header.index('nome')]} ({deputy_id}) — foto: {url_foto or '(vazio)'}")
    time.sleep(0.3)

with open(path, "w", encoding="utf-8", newline="") as f:
    writer = csv.writer(f, delimiter=";", quotechar='"', quoting=csv.QUOTE_ALL)
    writer.writerows(rows)

print(f"\nConcluído: {total} deputados atualizados.")
