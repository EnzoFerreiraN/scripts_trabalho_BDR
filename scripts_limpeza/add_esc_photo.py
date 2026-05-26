import csv
import time
import requests

input_path = "dados/deputados.csv"
output_path = "dados/deputados.csv"

with open(input_path, encoding="utf-8") as f:
    reader = csv.reader(f, delimiter=";", quotechar='"')
    rows = list(reader)

header = rows[0]
new_header = header + ["urlFoto", "escolaridade"]

new_rows = [new_header]
total = len(rows) - 1

for i, row in enumerate(rows[1:], start=1):
    deputy_id = row[0]
    url = f"https://dadosabertos.camara.leg.br/api/v2/deputados/{deputy_id}"

    try:
        resp = requests.get(url, headers={"accept": "application/json"}, timeout=15)
        resp.raise_for_status()
        data = resp.json().get("dados", {})
        url_foto = data.get("ultimoStatus", {}).get("urlFoto") or ""
        escolaridade = data.get("escolaridade") or ""
    except Exception as e:
        print(f"[{i}/{total}] Erro no deputado {deputy_id}: {e}")
        url_foto = ""
        escolaridade = ""

    new_rows.append(row + [url_foto, escolaridade])
    print(f"[{i}/{total}] {row[2]} ({deputy_id}) — escolaridade: {escolaridade or '(vazio)'}")
    time.sleep(0.3)

with open(output_path, "w", encoding="utf-8", newline="") as f:
    writer = csv.writer(f, delimiter=";", quotechar='"', quoting=csv.QUOTE_ALL)
    writer.writerows(new_rows)

print(f"\nConcluído: {len(new_rows) - 1} deputados processados.")
