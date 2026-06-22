"""
baixar_dados.py — Baixa os CSVs da Câmara dos Deputados e prepara os dados.

Uso: python baixar_dados.py

Etapas executadas em ordem:
  1. Baixa os CSVs anuais (votações, proposições, etc.) de dadosabertos.camara.leg.br
  2. Baixa os arquivos de gastos (CEAP) de camara.leg.br/cotas
  3. Limpa dados/deputados.csv: garante coluna 'id' e preenche 'urlFoto' com link bandep
  4. Adiciona coluna 'idProposicao' nos CSVs de proposicoesTemas
"""

import csv
import io
import zipfile
import requests
from pathlib import Path

# ── constantes ────────────────────────────────────────────────────────────────

BASE_URL      = "https://dadosabertos.camara.leg.br/arquivos/{tipo}/csv/{tipo}-{ano}.csv"
GASTOS_URL    = "https://www.camara.leg.br/cotas/Ano-{ano}.csv.zip"
FOTO_URL_TEMPLATE = "https://www.camara.leg.br/internet/deputado/bandep/{id}.jpg"

DADOS_DIR = Path(__file__).parent / "dados"

CSV_TIPOS = {
    "eventos":                  "eventos",
    "votacoes":                 "votacoes",
    "proposicoes":              "proposicoes",
    "proposicoesTemas":         "proposicoesTemas",
    "votacoesOrientacoes":      "votacoesOrientacoes",
    "eventosPresencaDeputados": "eventosPresencaDeputados",
    "votacoesVotos":            "votacoesVotos",
    "votacoesProposicoes":      "votacoesProposicoes",
    "proposicoesAutores":       "proposicoesAutores",
}

ANO_INICIO = 2023
ANO_FIM    = 2026


# ── helpers ───────────────────────────────────────────────────────────────────

def baixar_arquivo(url: str, destino: Path) -> bool:
    """Baixa url para destino. Retorna False se 404 ou erro de rede."""
    try:
        resp = requests.get(url, timeout=60, stream=True)
        if resp.status_code == 404:
            return False
        resp.raise_for_status()
        destino.write_bytes(resp.content)
        return True
    except requests.RequestException:
        return False


# ── etapas ───────────────────────────────────────────────────────────────────

def baixar_csvs_por_ano():
    """Baixa os CSVs anuais de votações, proposições, etc."""
    for tipo, pasta in CSV_TIPOS.items():
        dir_destino = DADOS_DIR / pasta
        dir_destino.mkdir(parents=True, exist_ok=True)

        print(f"\n{'='*50}")
        print(f"Baixando: {tipo}")
        print(f"Destino : {dir_destino}")
        print(f"{'='*50}")

        encontrados = 0
        for ano in range(ANO_INICIO, ANO_FIM + 1):
            url     = BASE_URL.format(tipo=tipo, ano=ano)
            destino = dir_destino / f"{tipo}-{ano}.csv"

            if destino.exists():
                print(f"  {ano} - já existe, pulando")
                encontrados += 1
                continue

            ok = baixar_arquivo(url, destino)
            if ok:
                tamanho_kb = destino.stat().st_size / 1024
                print(f"  {ano} - OK ({tamanho_kb:.1f} KB)")
                encontrados += 1
            else:
                print(f"  {ano} - não encontrado")

        print(f"  Total baixado/existente: {encontrados} arquivo(s)")


def baixar_gastos():
    """
    Baixa os arquivos de gastos da CEAP (Ano-{ano}.csv.zip) e extrai o CSV interno.

    O endpoint .csv (sem zip) retorna HTML/lixo via GET; o .csv.zip é o correto.
    O zip contém exatamente um arquivo — Ano-{ano}.csv — que é gravado diretamente
    em dados/gastos/Ano-{ano}.csv.
    """
    dir_destino = DADOS_DIR / "gastos"
    dir_destino.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*50}")
    print(f"Baixando: gastos (CEAP)")
    print(f"Destino : {dir_destino}")
    print(f"{'='*50}")

    encontrados = 0
    for ano in range(ANO_INICIO, ANO_FIM + 1):
        destino = dir_destino / f"Ano-{ano}.csv"

        if destino.exists():
            print(f"  {ano} - já existe, pulando")
            encontrados += 1
            continue

        url = GASTOS_URL.format(ano=ano)
        try:
            resp = requests.get(url, timeout=120)
            if resp.status_code == 404:
                print(f"  {ano} - não encontrado")
                continue
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"  {ano} - erro de rede: {e}")
            continue

        try:
            with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
                nome_csv = next(
                    (n for n in zf.namelist() if n.lower().endswith(".csv")), None
                )
                if nome_csv is None:
                    print(f"  {ano} - zip sem CSV interno")
                    continue
                destino.write_bytes(zf.read(nome_csv))
        except zipfile.BadZipFile:
            print(f"  {ano} - resposta não é um zip válido")
            continue

        tamanho_kb = destino.stat().st_size / 1024
        print(f"  {ano} - OK ({tamanho_kb:.1f} KB)")
        encontrados += 1

    print(f"  Total baixado/existente: {encontrados} arquivo(s)")


def limpar_deputados():
    """
    Garante que dados/deputados.csv tenha as colunas 'id' e 'urlFoto'.

    - Coluna 'id': se ausente, derivada da coluna 'uri' (último segmento do path).
      Se já presente, mantida como está.
    - Coluna 'urlFoto': preenchida com o link bandep fixo para TODOS os deputados,
      usando o 'id'. Se a coluna não existir, é criada.
    - Coluna 'escolaridade': mantida intacta (não é alterada).

    Idempotente: pode ser rodada várias vezes sem efeito colateral.
    """
    path = DADOS_DIR / "deputados.csv"
    if not path.exists():
        print(f"\n[WARN] limpar_deputados: {path} não encontrado, pulando.")
        return

    print(f"\n{'='*50}")
    print("Limpando: deputados.csv")
    print(f"{'='*50}")

    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.reader(f, delimiter=";", quotechar='"')
        rows   = list(reader)

    if not rows:
        print("  arquivo vazio, pulando.")
        return

    header = rows[0]

    # — garante coluna 'id' —
    if "id" not in header:
        if "uri" not in header:
            print("  [WARN] coluna 'uri' não encontrada; 'id' não pode ser derivado.")
        else:
            uri_col = header.index("uri")
            header  = ["id"] + header
            for i, row in enumerate(rows[1:], start=1):
                uri_val  = row[uri_col] if uri_col < len(row) else ""
                id_value = uri_val.rstrip("/").rsplit("/", 1)[-1]
                rows[i]  = [id_value] + row
            print("  coluna 'id' adicionada.")
    else:
        print("  coluna 'id' já existe.")

    # — garante coluna 'urlFoto' e preenche com link bandep —
    id_col = header.index("id") if "id" in header else None

    if "urlFoto" not in header:
        header = header + ["urlFoto"]
        for i, row in enumerate(rows[1:], start=1):
            dep_id  = row[id_col].strip('"') if id_col is not None and id_col < len(row) else ""
            url_foto = FOTO_URL_TEMPLATE.format(id=dep_id) if dep_id else ""
            rows[i]  = row + [url_foto]
        print("  coluna 'urlFoto' adicionada e preenchida.")
    else:
        foto_col = header.index("urlFoto")
        atualizados = 0
        for i, row in enumerate(rows[1:], start=1):
            dep_id  = row[id_col].strip('"') if id_col is not None and id_col < len(row) else ""
            url_foto = FOTO_URL_TEMPLATE.format(id=dep_id) if dep_id else ""
            # Estende a linha se necessário
            while len(rows[i]) <= foto_col:
                rows[i].append("")
            rows[i][foto_col] = url_foto
            atualizados += 1
        print(f"  coluna 'urlFoto' atualizada para {atualizados} deputado(s).")

    rows[0] = header

    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, delimiter=";", quotechar='"', quoting=csv.QUOTE_ALL)
        writer.writerows(rows)

    print(f"  OK — {len(rows) - 1} linha(s) salvas.")


def _extrair_id(uri: str) -> str:
    return uri.rstrip("/").rsplit("/", 1)[-1]


def limpar_proposicoes_temas():
    """
    Adiciona a coluna 'idProposicao' (derivada de 'uriProposicao') em cada
    arquivo proposicoesTemas-*.csv, logo após a coluna 'uriProposicao'.
    Idempotente: pula arquivos que já têm a coluna.
    """
    pasta = DADOS_DIR / "proposicoesTemas"
    if not pasta.exists():
        print(f"\n[WARN] limpar_proposicoes_temas: pasta {pasta} não encontrada, pulando.")
        return

    print(f"\n{'='*50}")
    print("Limpando: proposicoesTemas (adicionando idProposicao)")
    print(f"{'='*50}")

    arquivos = sorted(pasta.glob("proposicoesTemas-*.csv"))
    print(f"  {len(arquivos)} arquivo(s) encontrado(s)")

    for arq in arquivos:
        with open(arq, encoding="utf-8-sig", newline="") as f:
            rows = list(csv.DictReader(f, delimiter=";"))

        if not rows:
            print(f"  {arq.name} - vazio, pulando")
            continue

        if "idProposicao" in rows[0]:
            print(f"  {arq.name} - coluna já existe, pulando")
            continue

        for row in rows:
            row["idProposicao"] = _extrair_id(row.get("uriProposicao", ""))

        # Reordena: idProposicao logo após uriProposicao
        campos = list(rows[0].keys())
        campos.remove("idProposicao")
        if "uriProposicao" in campos:
            idx = campos.index("uriProposicao") + 1
            campos.insert(idx, "idProposicao")
        else:
            campos.append("idProposicao")

        with open(arq, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=campos, delimiter=";")
            writer.writeheader()
            writer.writerows(rows)

        print(f"  {arq.name} - OK ({len(rows)} linhas)")


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    print("=== baixar_dados.py ===\n")
    baixar_csvs_por_ano()
    baixar_gastos()
    limpar_deputados()
    limpar_proposicoes_temas()
    print("\n[DONE] Todos os dados preparados.")


if __name__ == "__main__":
    main()
