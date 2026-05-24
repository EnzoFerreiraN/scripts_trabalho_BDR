import os
import requests
from pathlib import Path

BASE_URL = "https://dadosabertos.camara.leg.br/arquivos/{tipo}/csv/{tipo}-{ano}.csv"
DADOS_DIR = Path(__file__).parent / "dados"

# Mapeamento: nome do arquivo -> nome da pasta de destino
CSV_TIPOS = {
    "votacoes":                  "votacoes",
    "proposicoes":               "proposicoes",
    "proposicoesTemas":          "proposicoesTemas",
    "votacoesOrientacoes":       "votacoesOrientacoes",
    "eventosPresencaDeputados":  "eventosPresencaDeputados",
    "votacoesVotos":             "votacoesVotos",
    "votacoesProposicoes":       "votacoesProposicoes",
    "proposicoesAutores":        "proposicoesAutores",
}

ANO_INICIO = 1990
ANO_FIM = 2026


def baixar_arquivo(url: str, destino: Path) -> bool:
    try:
        resp = requests.get(url, timeout=60, stream=True)
        if resp.status_code == 404:
            return False
        resp.raise_for_status()
        destino.write_bytes(resp.content)
        return True
    except requests.RequestException:
        return False


def main():
    for tipo, pasta in CSV_TIPOS.items():
        dir_destino = DADOS_DIR / pasta
        dir_destino.mkdir(parents=True, exist_ok=True)

        print(f"\n{'='*50}")
        print(f"Baixando: {tipo}")
        print(f"Destino : {dir_destino}")
        print(f"{'='*50}")

        encontrados = 0
        for ano in range(ANO_INICIO, ANO_FIM + 1):
            url = BASE_URL.format(tipo=tipo, ano=ano)
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

    print("\nConcluído.")


if __name__ == "__main__":
    main()
