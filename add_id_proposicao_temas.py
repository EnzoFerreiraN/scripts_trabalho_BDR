import csv
import os
from pathlib import Path

PASTA = Path(__file__).parent / "dados" / "proposicoesTemas"


def extrair_id(uri: str) -> str:
    return uri.rstrip("/").rsplit("/", 1)[-1]


def processar_arquivo(path: Path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f, delimiter=";"))

    if not rows:
        print(f"  {path.name} - vazio, pulando")
        return

    if "idProposicao" in rows[0]:
        print(f"  {path.name} - coluna já existe, pulando")
        return

    for row in rows:
        row["idProposicao"] = extrair_id(row["uriProposicao"])

    # Reordena: idProposicao logo após uriProposicao
    campos_originais = list(rows[0].keys())
    campos_originais.remove("idProposicao")
    idx = campos_originais.index("uriProposicao") + 1
    campos_originais.insert(idx, "idProposicao")

    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=campos_originais, delimiter=";")
        writer.writeheader()
        writer.writerows(rows)

    print(f"  {path.name} - OK ({len(rows)} linhas)")


def main():
    arquivos = sorted(PASTA.glob("proposicoesTemas-*.csv"))
    print(f"Processando {len(arquivos)} arquivo(s) em {PASTA}\n")
    for arq in arquivos:
        processar_arquivo(arq)
    print("\nConcluído.")


if __name__ == "__main__":
    main()
