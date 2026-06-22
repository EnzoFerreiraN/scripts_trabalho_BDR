"""
etl-2023-2026.py — Carga dos CSVs da Câmara dos Deputados no banco SQLite.
Uso: python etl-2023-2026.py
Gera: camara-2023-2026.db no mesmo diretório.

Pré-requisito: rodar baixar_dados.py para obter os CSVs em dados/.
"""

import csv
import sqlite3
import sys
from pathlib import Path

# No Windows sys.maxsize pode estourar; usa o maior valor suportado pela plataforma.
try:
    csv.field_size_limit(sys.maxsize)
except OverflowError:
    csv.field_size_limit(2 ** 31 - 1)

BASE              = Path(__file__).parent
DB                = BASE / "camara-2023-2026.db"
SCHEMA            = BASE / "schema.sql"
DATA              = BASE / "dados"
FOTO_URL_TEMPLATE = "https://www.camara.leg.br/internet/deputado/bandep/{id}.jpg"


# ── helpers ──────────────────────────────────────────────────────────────────

def n(v):
    """Converte string vazia em None."""
    return None if (v is None or str(v).strip() == "") else v


def to_int(v):
    v = n(v)
    if v is None:
        return None
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return None


def to_real(v):
    v = n(v)
    if v is None:
        return None
    try:
        return float(str(v).replace(",", "."))
    except (ValueError, TypeError):
        return None


def read_csv(path: Path):
    """Lê CSV semicolon-delimitado com quotechar duplo."""
    rows = []
    try:
        with open(path, newline="", encoding="utf-8-sig", errors="replace") as f:
            reader = csv.DictReader(f, delimiter=";", quotechar='"')
            for row in reader:
                rows.append(row)
    except csv.Error as exc:
        print(f"  [WARN] parse error em {path.name}: {exc}")
    return rows


def insert(conn, table, cols, rows):
    if not rows:
        return 0
    ph  = ",".join(["?"] * len(cols))
    sql = f"INSERT OR IGNORE INTO {table} ({','.join(cols)}) VALUES ({ph})"
    with conn:
        conn.executemany(sql, rows)
    return len(rows)


def glob(pattern: str):
    return sorted(DATA.glob(pattern))


# ── cargas por tabela ─────────────────────────────────────────────────────────

def load_deputados(conn):
    rows = read_csv(DATA / "deputados.csv")
    cols = ["id", "uri", "nome", "idLegislaturaInicial", "idLegislaturaFinal",
            "nomeCivil", "cpf", "siglaSexo", "urlRedeSocial", "urlWebsite",
            "dataNascimento", "dataFalecimento", "ufNascimento",
            "municipioNascimento", "escolaridade", "urlFoto"]
    data = []
    for r in rows:
        id_ = to_int(r.get("id"))
        if id_ is None:
            continue
        data.append((
            id_, n(r.get("uri")), n(r.get("nome")),
            to_int(r.get("idLegislaturaInicial")), to_int(r.get("idLegislaturaFinal")),
            n(r.get("nomeCivil")), n(r.get("cpf")), n(r.get("siglaSexo")),
            n(r.get("urlRedeSocial")), n(r.get("urlWebsite")),
            n(r.get("dataNascimento")), n(r.get("dataFalecimento")),
            n(r.get("ufNascimento")), n(r.get("municipioNascimento")),
            n(r.get("escolaridade")), n(r.get("urlFoto")),
        ))
    count = insert(conn, "deputado", cols, data)
    print(f"[OK] deputado         ← deputados.csv ({count} linhas)")


def load_eventos(conn):
    cols = ["id", "uri", "urlDocumentoPauta", "dataHoraInicio", "dataHoraFim",
            "situacao", "descricao", "descricaoTipo", "localExterno",
            "localCamara_nome", "localCamara_predio", "localCamara_sala",
            "localCamara_andar"]
    total = 0
    for path in glob("eventos/eventos-*.csv"):
        rows = read_csv(path)
        data = []
        for r in rows:
            id_ = to_int(r.get("id"))
            if id_ is None:
                continue
            data.append((
                id_, n(r.get("uri")), n(r.get("urlDocumentoPauta")),
                n(r.get("dataHoraInicio")), n(r.get("dataHoraFim")),
                n(r.get("situacao")), n(r.get("descricao")), n(r.get("descricaoTipo")),
                n(r.get("localExterno")),
                n(r.get("localCamara.nome")), n(r.get("localCamara.predio")),
                n(r.get("localCamara.sala")), n(r.get("localCamara.andar")),
            ))
        insert(conn, "evento", cols, data)
        total += len(data)
        print(f"  evento            ← {path.name} ({len(data)})")
    print(f"[OK] evento           — {total} total")


def load_proposicoes(conn):
    cols = [
        "id", "uri", "siglaTipo", "numero", "ano", "codTipo", "descricaoTipo",
        "ementa", "ementaDetalhada", "keywords", "dataApresentacao",
        "uriOrgaoNumerador", "uriPropAnterior", "uriPropPrincipal", "uriPropPosterior",
        "urlInteiroTeor", "urnFinal",
        "ultimoStatus_dataHora", "ultimoStatus_sequencia", "ultimoStatus_uriRelator",
        "ultimoStatus_idOrgao", "ultimoStatus_siglaOrgao", "ultimoStatus_uriOrgao",
        "ultimoStatus_regime", "ultimoStatus_descricaoTramitacao",
        "ultimoStatus_idTipoTramitacao", "ultimoStatus_descricaoSituacao",
        "ultimoStatus_idSituacao",
    ]
    total = 0
    for path in glob("proposicoes/proposicoes-*.csv"):
        rows = read_csv(path)
        data = []
        for r in rows:
            id_ = to_int(r.get("id"))
            if id_ is None:
                continue
            data.append((
                id_, n(r.get("uri")), n(r.get("siglaTipo")),
                to_int(r.get("numero")), to_int(r.get("ano")),
                to_int(r.get("codTipo")), n(r.get("descricaoTipo")),
                n(r.get("ementa")), n(r.get("ementaDetalhada")), n(r.get("keywords")),
                n(r.get("dataApresentacao")), n(r.get("uriOrgaoNumerador")),
                n(r.get("uriPropAnterior")), n(r.get("uriPropPrincipal")),
                n(r.get("uriPropPosterior")), n(r.get("urlInteiroTeor")),
                n(r.get("urnFinal")),
                n(r.get("ultimoStatus_dataHora")),
                to_int(r.get("ultimoStatus_sequencia")),
                n(r.get("ultimoStatus_uriRelator")),
                to_int(r.get("ultimoStatus_idOrgao")),
                n(r.get("ultimoStatus_siglaOrgao")),
                n(r.get("ultimoStatus_uriOrgao")),
                n(r.get("ultimoStatus_regime")),
                n(r.get("ultimoStatus_descricaoTramitacao")),
                to_int(r.get("ultimoStatus_idTipoTramitacao")),
                n(r.get("ultimoStatus_descricaoSituacao")),
                to_int(r.get("ultimoStatus_idSituacao")),
            ))
        insert(conn, "proposicao", cols, data)
        total += len(data)
        print(f"  proposicao        ← {path.name} ({len(data)})")
    print(f"[OK] proposicao       — {total} total")


def load_temas(conn):
    seen = {}
    for path in glob("proposicoesTemas/proposicoesTemas-*.csv"):
        for r in read_csv(path):
            cod = to_int(r.get("codTema"))
            if cod is not None and cod not in seen:
                seen[cod] = n(r.get("tema"))
    data  = [(cod, tema, None) for cod, tema in seen.items() if tema]
    count = insert(conn, "tema", ["codTema", "tema", "relevancia"], data)
    print(f"[OK] tema             — {count} temas únicos")


def load_bancadas(conn):
    seen = {}
    for path in glob("votacoesOrientacoes/votacoesOrientacoes-*.csv"):
        for r in read_csv(path):
            sigla = n(r.get("siglaBancada"))
            if sigla and sigla not in seen:
                seen[sigla] = n(r.get("uriBancada"))
    data  = [(s, u) for s, u in seen.items()]
    count = insert(conn, "bancada", ["siglaBancada", "uriBancada"], data)
    print(f"[OK] bancada          — {count} bancadas únicas")


def load_votacoes(conn):
    cols = [
        "id", "uri", "data", "dataHoraRegistro", "idOrgao", "uriOrgao", "siglaOrgao",
        "idEvento", "uriEvento", "aprovacao", "votosSim", "votosNao", "votosOutros",
        "descricao",
        "ultimaAberturaVotacao_dataHoraRegistro", "ultimaAberturaVotacao_descricao",
        "ultimaApresentacaoProposicao_dataHoraRegistro",
        "ultimaApresentacaoProposicao_descricao",
        "ultimaApresentacaoProposicao_idProposicao",
        "ultimaApresentacaoProposicao_uriProposicao",
    ]
    total = 0
    for path in glob("votacoes/votacoes-*.csv"):
        rows = read_csv(path)
        data = []
        for r in rows:
            id_ = n(r.get("id"))
            if id_ is None:
                continue
            id_evento = to_int(r.get("idEvento"))
            if id_evento == 0:
                id_evento = None
            data.append((
                id_, n(r.get("uri")), n(r.get("data")), n(r.get("dataHoraRegistro")),
                to_int(r.get("idOrgao")), n(r.get("uriOrgao")), n(r.get("siglaOrgao")),
                id_evento, n(r.get("uriEvento")),
                to_int(r.get("aprovacao")),
                to_int(r.get("votosSim")), to_int(r.get("votosNao")),
                to_int(r.get("votosOutros")), n(r.get("descricao")),
                n(r.get("ultimaAberturaVotacao_dataHoraRegistro")),
                n(r.get("ultimaAberturaVotacao_descricao")),
                n(r.get("ultimaApresentacaoProposicao_dataHoraRegistro")),
                n(r.get("ultimaApresentacaoProposicao_descricao")),
                to_int(r.get("ultimaApresentacaoProposicao_idProposicao")),
                n(r.get("ultimaApresentacaoProposicao_uriProposicao")),
            ))
        insert(conn, "votacao", cols, data)
        total += len(data)
        print(f"  votacao           ← {path.name} ({len(data)})")
    print(f"[OK] votacao          — {total} total")


def load_gastos(conn):
    cols = [
        "ideDocumento", "nuDeputadoId", "txNomeParlamentar", "cpf", "idDeCadastro",
        "nuCarteiraParlamentar", "nuLegislatura", "sgUF", "sgPartido", "codLegislatura",
        "numSubCota", "txtDescricao", "numEspecificacaoSubCota", "txtDescricaoEspecificacao",
        "txtFornecedor", "txtCNPJCPF", "txtNumero", "indTipoDocumento", "datEmissao",
        "vlrDocumento", "vlrGlosa", "vlrLiquido", "numMes", "numAno", "numParcela",
        "txtPassageiro", "txtTrecho", "numLote", "numRessarcimento",
        "datPagamentoRestituicao", "vlrRestituicao", "urlDocumento",
    ]
    total = 0
    for path in glob("gastos/Ano-*.csv"):
        rows = read_csv(path)
        data = []
        for r in rows:
            ide = to_int(r.get("ideDocumento"))
            if ide is None:
                continue
            data.append((
                ide, to_int(r.get("nuDeputadoId")),
                n(r.get("txNomeParlamentar")), n(r.get("cpf")),
                to_int(r.get("ideCadastro")), to_int(r.get("nuCarteiraParlamentar")),
                to_int(r.get("nuLegislatura")), n(r.get("sgUF")), n(r.get("sgPartido")),
                to_int(r.get("codLegislatura")), to_int(r.get("numSubCota")),
                n(r.get("txtDescricao")), to_int(r.get("numEspecificacaoSubCota")),
                n(r.get("txtDescricaoEspecificacao")), n(r.get("txtFornecedor")),
                n(r.get("txtCNPJCPF")), n(r.get("txtNumero")),
                to_int(r.get("indTipoDocumento")), n(r.get("datEmissao")),
                to_real(r.get("vlrDocumento")), to_real(r.get("vlrGlosa")),
                to_real(r.get("vlrLiquido")),
                to_int(r.get("numMes")), to_int(r.get("numAno")),
                to_int(r.get("numParcela")), n(r.get("txtPassageiro")),
                n(r.get("txtTrecho")), to_int(r.get("numLote")),
                to_int(r.get("numRessarcimento")),
                n(r.get("datPagamentoRestituicao")), to_real(r.get("vlrRestituicao")),
                n(r.get("urlDocumento")),
            ))
        insert(conn, "gasto", cols, data)
        total += len(data)
        print(f"  gasto             ← {path.name} ({len(data)})")
    print(f"[OK] gasto            — {total} total")


def load_presencas(conn):
    cols = ["idEvento", "idDeputado", "data", "uriEvento", "uriDeputado"]
    total = 0
    for path in glob("eventosPresencaDeputados/eventosPresencaDeputados-*.csv"):
        rows = read_csv(path)
        data = []
        for r in rows:
            id_ev  = to_int(r.get("idEvento"))
            id_dep = to_int(r.get("idDeputado"))
            if id_ev is None or id_dep is None:
                continue
            data.append((
                id_ev, id_dep,
                n(r.get("dataHoraInicio")),
                n(r.get("uriEvento")), n(r.get("uriDeputado")),
            ))
        insert(conn, "presenca", cols, data)
        total += len(data)
        print(f"  presenca          ← {path.name} ({len(data)})")
    print(f"[OK] presenca         — {total} total")


def load_votos(conn):
    cols = ["idVotacao", "deputado_id", "voto", "dataHoraVoto", "deputado_uri",
            "deputado_nome", "deputado_siglaPartido", "deputado_siglaUf",
            "deputado_urlFoto"]
    total = 0
    for path in glob("votacoesVotos/votacoesVotos-*.csv"):
        rows = read_csv(path)
        data = []
        for r in rows:
            id_vot = n(r.get("idVotacao"))
            id_dep = to_int(r.get("deputado_id"))
            if id_vot is None or id_dep is None:
                continue
            data.append((
                id_vot, id_dep,
                n(r.get("voto")), n(r.get("dataHoraVoto")),
                n(r.get("deputado_uri")), n(r.get("deputado_nome")),
                n(r.get("deputado_siglaPartido")), n(r.get("deputado_siglaUf")),
                n(r.get("deputado_urlFoto")),
            ))
        insert(conn, "voto", cols, data)
        total += len(data)
        print(f"  voto              ← {path.name} ({len(data)})")
    print(f"[OK] voto             — {total} total")


def load_pautas(conn):
    folder = DATA / "votacoesProposicoes"
    if not folder.exists():
        print("[SKIP] pauta         — pasta votacoesProposicoes não encontrada")
        return
    cols = ["idVotacao", "proposicao_id", "data", "descricao",
            "proposicao_uri", "proposicao_titulo", "proposicao_ementa",
            "proposicao_codTipo", "proposicao_siglaTipo",
            "proposicao_numero", "proposicao_ano"]
    total = 0
    for path in sorted(folder.glob("votacoesProposicoes-*.csv")):
        rows = read_csv(path)
        data = []
        for r in rows:
            id_vot  = n(r.get("idVotacao"))
            id_prop = to_int(r.get("proposicao_id"))
            if id_vot is None or id_prop is None:
                continue
            data.append((
                id_vot, id_prop,
                n(r.get("data")), n(r.get("descricao")),
                n(r.get("proposicao_uri")), n(r.get("proposicao_titulo")),
                n(r.get("proposicao_ementa")),
                to_int(r.get("proposicao_codTipo")), n(r.get("proposicao_siglaTipo")),
                to_int(r.get("proposicao_numero")), to_int(r.get("proposicao_ano")),
            ))
        insert(conn, "pauta", cols, data)
        total += len(data)
        print(f"  pauta             ← {path.name} ({len(data)})")
    print(f"[OK] pauta            — {total} total")


def load_orientacoes(conn):
    cols = ["idVotacao", "siglaBancada", "uriVotacao", "siglaOrgao",
            "descricao", "uriBancada", "orientacao"]
    total = 0
    for path in glob("votacoesOrientacoes/votacoesOrientacoes-*.csv"):
        rows = read_csv(path)
        data = []
        for r in rows:
            id_vot = n(r.get("idVotacao"))
            sigla  = n(r.get("siglaBancada"))
            if id_vot is None or sigla is None:
                continue
            data.append((
                id_vot, sigla,
                n(r.get("uriVotacao")), n(r.get("siglaOrgao")),
                n(r.get("descricao")), n(r.get("uriBancada")),
                n(r.get("orientacao")),
            ))
        insert(conn, "orientacao", cols, data)
        total += len(data)
        print(f"  orientacao        ← {path.name} ({len(data)})")
    print(f"[OK] orientacao       — {total} total")


def load_autorias(conn):
    cols = ["idProposicao", "idDeputadoAutor", "uriProposicao", "uriAutor",
            "codTipoAutor", "tipoAutor", "nomeAutor", "siglaPartidoAutor",
            "uriPartidoAutor", "siglaUFAutor", "ordemAssinatura", "proponente"]
    total = 0
    for path in glob("proposicoesAutores/proposicoesAutores-*.csv"):
        rows = read_csv(path)
        data = []
        for r in rows:
            id_prop = to_int(r.get("idProposicao"))
            if id_prop is None:
                continue
            nome  = n(r.get("nomeAutor")) or ""
            ordem = to_int(r.get("ordemAssinatura")) or 0
            data.append((
                id_prop, to_int(r.get("idDeputadoAutor")),
                n(r.get("uriProposicao")), n(r.get("uriAutor")),
                to_int(r.get("codTipoAutor")), n(r.get("tipoAutor")),
                nome, n(r.get("siglaPartidoAutor")),
                n(r.get("uriPartidoAutor")), n(r.get("siglaUFAutor")),
                ordem, to_int(r.get("proponente")),
            ))
        insert(conn, "autoria", cols, data)
        total += len(data)
        print(f"  autoria           ← {path.name} ({len(data)})")
    print(f"[OK] autoria          — {total} total")


def preencher_fotos_faltantes(conn):
    """
    Preenche urlFoto com o link bandep para deputados que não tenham foto.
    Rede de segurança: o baixar_dados.py já deve ter populado o CSV,
    mas esta etapa garante consistência no banco.
    """
    cur = conn.execute("SELECT id FROM deputado WHERE urlFoto IS NULL OR urlFoto = ''")
    ids = [row[0] for row in cur.fetchall()]
    if not ids:
        print("[OK] preencher_fotos  — todos os deputados já têm urlFoto")
        return
    with conn:
        for dep_id in ids:
            url = FOTO_URL_TEMPLATE.format(id=dep_id)
            conn.execute("UPDATE deputado SET urlFoto = ? WHERE id = ?", (url, dep_id))
    print(f"[OK] preencher_fotos  — {len(ids)} urlFoto(s) preenchida(s)")


def load_classificacoes(conn):
    cols = ["idProposicao", "codTema", "uriProposicao", "siglaTipo",
            "numero", "ano", "relevancia"]
    total = 0
    for path in glob("proposicoesTemas/proposicoesTemas-*.csv"):
        rows = read_csv(path)
        data = []
        for r in rows:
            id_prop  = to_int(r.get("idProposicao"))
            cod_tema = to_int(r.get("codTema"))
            if id_prop is None or cod_tema is None:
                continue
            data.append((
                id_prop, cod_tema,
                n(r.get("uriProposicao")), n(r.get("siglaTipo")),
                to_int(r.get("numero")), to_int(r.get("ano")),
                to_int(r.get("relevancia")),
            ))
        insert(conn, "classificacao", cols, data)
        total += len(data)
        print(f"  classificacao     ← {path.name} ({len(data)})")
    print(f"[OK] classificacao    — {total} total")


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    if DB.exists():
        DB.unlink()
        print(f"[INFO] banco anterior removido: {DB.name}")

    conn = sqlite3.connect(DB)
    # FK enforcement off durante a carga (dados históricos têm referências cruzadas)
    conn.execute("PRAGMA foreign_keys = OFF")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA cache_size = -64000")  # 64 MB cache

    with open(SCHEMA, encoding="utf-8") as f:
        conn.executescript(f.read())
    print("[OK] schema criado\n")

    load_deputados(conn)
    preencher_fotos_faltantes(conn)
    print()
    load_eventos(conn)
    print()
    load_proposicoes(conn)
    print()
    load_temas(conn)
    load_bancadas(conn)
    print()
    load_votacoes(conn)
    print()
    load_gastos(conn)
    print()
    load_presencas(conn)
    print()
    load_votos(conn)
    print()
    load_pautas(conn)
    print()
    load_orientacoes(conn)
    print()
    load_autorias(conn)
    print()
    load_classificacoes(conn)

    # Verificação de integridade
    print("\n── verificação ──────────────────────────────────────────")
    tables = ["deputado", "evento", "proposicao", "tema", "bancada",
              "votacao", "gasto", "presenca", "voto", "pauta",
              "orientacao", "autoria", "classificacao"]
    for t in tables:
        (count,) = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()
        print(f"  {t:<20} {count:>10} linhas")

    conn.execute("PRAGMA foreign_keys = ON")
    violations = conn.execute("PRAGMA foreign_key_check").fetchall()
    if violations:
        print(f"\n[WARN] {len(violations)} violações de FK encontradas")
        for v in violations[:10]:
            print(f"  {v}")
    else:
        print("\n[OK] sem violações de chave estrangeira")

    conn.close()
    print(f"\n[DONE] banco gerado: {DB}")


if __name__ == "__main__":
    main()
