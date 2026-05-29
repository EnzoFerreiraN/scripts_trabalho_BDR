import csv

input_path = "dados/deputados.csv"
output_path = "dados/deputados.csv"

with open(input_path, encoding="utf-8") as f:
    reader = csv.reader(f, delimiter=";", quotechar='"')
    rows = list(reader)

header = rows[0]
new_header = ["id"] + header

new_rows = [new_header]
for row in rows[1:]:
    uri = row[0]
    id_value = uri.rstrip("/").split("/")[-1]
    new_rows.append([id_value] + row)

with open(output_path, "w", encoding="utf-8", newline="") as f:
    writer = csv.writer(f, delimiter=";", quotechar='"', quoting=csv.QUOTE_ALL)
    writer.writerows(new_rows)

print(f"Concluído: {len(new_rows) - 1} linhas processadas.")
