"""
Q8 — Visão Geral do Deputado.

Endpoint agregador: recebe o id de um deputado e devolve um único objeto
com todos os dados necessários para a página de visão geral:
  - totais de gastos (CEAP) e distribuição por categoria
  - principais fornecedores
  - eixos de atuação (temas legislativos) para nuvem de palavras
  - palavras mais frequentes nas ementas das proposições de autoria
  - padrão de votação por tema
  - score e % de influência parlamentar
  - escolaridade
"""

import re
from collections import Counter

from fastapi import APIRouter, HTTPException

import cache
from database import get_connection
from schemas import (
    DeputadoBasico,
    FornecedorDeputado,
    InfluenciaDeputado,
    PalavraEmentaDeputado,
    TemaDeputadoNuvem,
    VisaoGeralDeputado,
    VotoAgregadoTema,
)
from stopwords_pt import STOPWORDS

router = APIRouter()

# Palavras = sequências de letras (com acentos) de 3+ caracteres.
TOKEN_RE = re.compile(r"[a-záàâãéêíóôõúüç]{3,}")
MAX_PALAVRAS_DEP = 80

# ── SQL ───────────────────────────────────────────────────────────────────────

SQL_DEPUTADOS = """
SELECT d.id, d.nome, d.urlFoto
FROM vw_gasto_deputado g
JOIN deputado d ON d.id = g.id
ORDER BY d.nome;
"""

SQL_HEADER = """
SELECT d.id, d.nome, d.urlFoto, g.partido, g.uf, g.total_gasto, g.num_transacoes
FROM vw_gasto_deputado g
JOIN deputado d ON d.id = g.id
WHERE g.id = :id;
"""

SQL_ESCOLARIDADE = """
SELECT escolaridade, escolaridade_ord
FROM vw_escolaridade_norm
WHERE dep_id = :id;
"""

SQL_GASTOS_CATEGORIA = """
SELECT
    txtDescricao                        AS categoria,
    COUNT(*)                            AS num_transacoes,
    ROUND(SUM(vlrLiquido), 2)           AS total,
    ROUND(AVG(vlrLiquido), 2)           AS media,
    txtFornecedor                       AS maior_fornecedor,
    ROUND(MAX(vlrLiquido), 2)           AS maior_valor
FROM gasto
WHERE idDeCadastro = :id
  AND vlrLiquido > 0
GROUP BY txtDescricao
ORDER BY total DESC
LIMIT 10;
"""

SQL_FORNECEDORES = """
SELECT
    txtFornecedor                       AS fornecedor,
    txtCNPJCPF                          AS cnpj_cpf,
    COUNT(*)                            AS num_transacoes,
    ROUND(SUM(vlrLiquido), 2)           AS total_recebido
FROM gasto
WHERE idDeCadastro = :id
  AND vlrLiquido > 0
GROUP BY txtFornecedor, txtCNPJCPF
ORDER BY total_recebido DESC
LIMIT 10;
"""

SQL_TEMAS_NUVEM = """
SELECT t.tema, COUNT(DISTINCT a.idProposicao) AS num_proposicoes
FROM tema t
JOIN classificacao c ON c.codTema      = t.codTema
JOIN autoria a       ON a.idProposicao = c.idProposicao
WHERE a.idDeputadoAutor = :id
GROUP BY t.codTema, t.tema
ORDER BY num_proposicoes DESC;
"""

SQL_EMENTAS_DEP = """
SELECT DISTINCT p.id, p.ementa
FROM proposicao p
JOIN autoria a ON a.idProposicao = p.id
WHERE p.ementa IS NOT NULL
  AND p.ementa != ''
  AND a.idDeputadoAutor = :id;
"""

SQL_VOTOS_TEMAS = """
SELECT
    t.tema,
    v.voto,
    COUNT(*) AS num_votos
FROM voto v
JOIN pauta p         ON p.idVotacao    = v.idVotacao
JOIN classificacao c ON c.idProposicao = p.proposicao_id
JOIN tema t          ON t.codTema      = c.codTema
WHERE v.deputado_id = :id
GROUP BY t.tema, v.voto
ORDER BY t.tema, num_votos DESC;
"""

SQL_INFLUENCIA = """
SELECT score_ponderado, pct_influencia, em_pauta_plen, aprovadas_pelo_dep, taxa_aprovacao
FROM vw_influencia
WHERE id = :id;
"""

# ── lógica de negócio ─────────────────────────────────────────────────────────


def _compute_visao_geral(deputado_id: int) -> dict | None:
    conn = get_connection()
    cur = conn.cursor()

    # Cabeçalho e totais
    cur.execute(SQL_HEADER, {"id": deputado_id})
    header_row = cur.fetchone()
    if not header_row:
        conn.close()
        return None
    h = dict(header_row)

    # Escolaridade
    cur.execute(SQL_ESCOLARIDADE, {"id": deputado_id})
    esc_row = cur.fetchone()
    escolaridade = (
        dict(esc_row)
        if esc_row
        else {"escolaridade": "Sem informação", "escolaridade_ord": 0}
    )

    # Gastos por categoria (top 10)
    cur.execute(SQL_GASTOS_CATEGORIA, {"id": deputado_id})
    gastos_cat = [dict(r) for r in cur.fetchall()]

    # Principais fornecedores (top 10)
    cur.execute(SQL_FORNECEDORES, {"id": deputado_id})
    fornecedores = [dict(r) for r in cur.fetchall()]

    # Temas legislativos (nuvem)
    cur.execute(SQL_TEMAS_NUVEM, {"id": deputado_id})
    temas_nuvem = [dict(r) for r in cur.fetchall()]

    # Palavras das ementas (tokenização + remoção de stopwords)
    cur.execute(SQL_EMENTAS_DEP, {"id": deputado_id})
    counter: Counter = Counter()
    for row in cur.fetchall():
        ementa = row["ementa"]
        if ementa:
            tokens = TOKEN_RE.findall(ementa.lower())
            counter.update(t for t in tokens if t not in STOPWORDS)
    palavras = [
        {"palavra": p, "frequencia": f}
        for p, f in counter.most_common(MAX_PALAVRAS_DEP)
    ]

    # Votos por tema
    cur.execute(SQL_VOTOS_TEMAS, {"id": deputado_id})
    votos_tema = [dict(r) for r in cur.fetchall()]

    # Influência
    cur.execute(SQL_INFLUENCIA, {"id": deputado_id})
    inf_row = cur.fetchone()
    influencia = dict(inf_row) if inf_row else None

    conn.close()

    return {
        "id": h["id"],
        "nome": h["nome"],
        "urlFoto": h["urlFoto"],
        "partido": h["partido"],
        "uf": h["uf"],
        "total_gasto": h["total_gasto"],
        "num_transacoes": h["num_transacoes"],
        "escolaridade": escolaridade["escolaridade"],
        "escolaridade_ord": escolaridade["escolaridade_ord"],
        "gastos_categoria": gastos_cat,
        "fornecedores": fornecedores,
        "temas_nuvem": temas_nuvem,
        "palavras_ementas": palavras,
        "votos_por_tema": votos_tema,
        "influencia": influencia,
    }


# ── endpoints ─────────────────────────────────────────────────────────────────


def _get_deputados() -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL_DEPUTADOS)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/deputados", response_model=list[DeputadoBasico])
def listar_deputados():
    """Lista de deputados da legislatura atual para o autocomplete de busca."""
    return cache.get_or_compute("q8:deputados", _get_deputados, ttl=cache.STATIC_TTL)


@router.get("/visao-geral/{deputado_id}", response_model=VisaoGeralDeputado)
def visao_geral(deputado_id: int):
    """
    Retorna todos os dados de um deputado consolidados em um único objeto:
    gastos por categoria, fornecedores, temas (nuvem), palavras das ementas,
    votos por tema, influência parlamentar e escolaridade.
    Resultado cacheado por 1 hora.
    """
    cache_key = f"q8:visao:{deputado_id}"
    data = cache.get_or_compute(cache_key, lambda: _compute_visao_geral(deputado_id))
    if data is None:
        raise HTTPException(
            status_code=404,
            detail=f"Deputado com id={deputado_id} não encontrado na legislatura 2023-2026.",
        )
    return data


# Resposta pré-computada no startup (front pede /q8/deputados no mount).
WARMUP = [
    ("q8:deputados", _get_deputados),
]
