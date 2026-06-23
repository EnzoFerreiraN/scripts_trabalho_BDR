import re
from collections import Counter

from fastapi import APIRouter, Query

import cache
from database import get_connection
from schemas import RankingTema, TemaDeputado, DeputadoPorTema, PalavraEmenta
from stopwords_pt import STOPWORDS

router = APIRouter()

# Palavras = sequências de letras (com acentos) de 3+ caracteres.
# Descarta números, pontuação e siglas de 1-2 letras.
TOKEN_RE = re.compile(r"[a-záàâãéêíóôõúüç]{3,}")

# Quantos termos manter no cache (o endpoint fatia via ?limit=).
MAX_PALAVRAS = 500

SQL_RANKING_TEMAS = """
SELECT
    t.codTema,
    t.tema,
    COUNT(DISTINCT a.idProposicao) AS num_proposicoes,
    COUNT(DISTINCT a.idDeputadoAutor) AS num_deputados
FROM tema t
JOIN classificacao c ON c.codTema         = t.codTema
JOIN autoria a       ON a.idProposicao    = c.idProposicao
WHERE a.idDeputadoAutor IS NOT NULL
  AND (:partido IS NULL OR RTRIM(a.siglaPartidoAutor, '*') = :partido)
GROUP BY t.codTema, t.tema
ORDER BY num_proposicoes DESC;
"""

SQL_PARTIDOS = """
SELECT DISTINCT RTRIM(siglaPartidoAutor, '*') AS partido
FROM autoria
WHERE siglaPartidoAutor IS NOT NULL AND siglaPartidoAutor != ''
ORDER BY RTRIM(siglaPartidoAutor, '*');
"""

SQL_DEPUTADOS_POR_TEMA = """
SELECT
    d.id,
    d.nome,
    d.urlFoto,
    g.partido,
    g.uf,
    COUNT(DISTINCT a.idProposicao) AS num_proposicoes
FROM deputado d
JOIN autoria a       ON a.idDeputadoAutor = d.id
JOIN classificacao c ON c.idProposicao    = a.idProposicao
LEFT JOIN vw_gasto_deputado g ON g.id = d.id
WHERE c.codTema = :cod_tema
  AND a.idDeputadoAutor IS NOT NULL
  AND (:partido IS NULL OR RTRIM(a.siglaPartidoAutor, '*') = :partido)
GROUP BY d.id, d.nome
ORDER BY num_proposicoes DESC
LIMIT :limit;
"""

SQL_POR_DEPUTADO = """
WITH temas_por_dep AS (
    SELECT
        d.id,
        d.nome,
        t.tema,
        COUNT(*) AS num_proposicoes,
        ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY COUNT(*) DESC) AS rn
    FROM deputado d
    JOIN autoria a        ON a.idDeputadoAutor = d.id
    JOIN classificacao c  ON c.idProposicao    = a.idProposicao
    JOIN tema t           ON t.codTema         = c.codTema
    GROUP BY d.id, d.nome, t.codTema
)
SELECT id, nome, tema, num_proposicoes
FROM temas_por_dep
WHERE rn = 1
ORDER BY num_proposicoes DESC
LIMIT :limit;
"""


def _compute_ranking_temas(partido: str | None) -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL_RANKING_TEMAS, {"partido": partido})
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def _compute_palavras_ementas(partido: str | None) -> list[dict]:
    """Nuvem de palavras clássica: tokeniza as ementas das proposições,
    remove stopwords PT-BR e conta a frequência de cada palavra.
    Quando `partido` é fornecido, considera apenas proposições de autoria
    desse partido (via JOIN na tabela autoria)."""
    conn = get_connection()
    cur = conn.cursor()
    if partido:
        cur.execute(
            """
            SELECT DISTINCT p.id, p.ementa
            FROM proposicao p
            JOIN autoria a ON a.idProposicao = p.id
            WHERE p.ementa IS NOT NULL AND p.ementa != ''
              AND RTRIM(a.siglaPartidoAutor, '*') = :partido
            """,
            {"partido": partido},
        )
        # Itera o cursor diretamente (streaming) em vez de fetchall() para não
        # materializar todas as ementas do partido de uma vez na RAM.
        ementas = (r["ementa"] for r in cur)
    else:
        cur.execute("SELECT ementa FROM proposicao WHERE ementa IS NOT NULL AND ementa != ''")
        ementas = (row[0] for row in cur)

    counter = Counter()
    for ementa in ementas:
        tokens = TOKEN_RE.findall(ementa.lower())
        counter.update(t for t in tokens if t not in STOPWORDS)
    conn.close()
    return [
        {"palavra": palavra, "frequencia": freq}
        for palavra, freq in counter.most_common(MAX_PALAVRAS)
    ]


def _get_partidos() -> list:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL_PARTIDOS)
    partidos = [r["partido"] for r in cur.fetchall()]
    conn.close()
    return partidos


@router.get("/partidos")
def listar_partidos():
    """Lista de partidos disponíveis nas autorias de proposições."""
    return cache.get_or_compute("q2:partidos", _get_partidos, ttl=cache.STATIC_TTL)


@router.get("/ranking-temas", response_model=list[RankingTema])
def ranking_temas(partido: str | None = Query(default=None)):
    cache_key = f"q2:ranking-temas:{partido or 'all'}"
    return cache.get_or_compute(cache_key, lambda: _compute_ranking_temas(partido), ttl=cache.STATIC_TTL)


@router.get("/palavras-ementas", response_model=list[PalavraEmenta])
def palavras_ementas(
    limit: int = Query(default=120, ge=10, le=MAX_PALAVRAS),
    partido: str | None = Query(default=None),
):
    """Top N palavras mais frequentes nas ementas das proposições
    (tokenização + remoção de stopwords). Resultado cacheado em memória —
    a primeira chamada percorre todas as ementas e pode levar alguns segundos."""
    cache_key = f"q2:palavras-ementas:{partido or 'all'}"
    palavras = cache.get_or_compute(cache_key, lambda: _compute_palavras_ementas(partido), ttl=cache.STATIC_TTL)
    return palavras[:limit]


@router.get("/tema-por-deputado", response_model=list[TemaDeputado])
def tema_por_deputado(limit: int = Query(default=50, ge=1, le=513)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL_POR_DEPUTADO, {"limit": limit})
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/deputados-por-tema", response_model=list[DeputadoPorTema])
def deputados_por_tema(
    cod_tema: int = Query(..., description="Código do tema legislativo"),
    limit: int = Query(default=15, ge=1, le=100),
    partido: str | None = Query(default=None, description="Sigla do partido para filtrar (opcional)"),
):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL_DEPUTADOS_POR_TEMA, {"cod_tema": cod_tema, "limit": limit, "partido": partido})
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


# Respostas pré-computadas no startup (sem filtro de partido — carga inicial do front).
# q2:palavras-ementas:all foi removido do warm-up: varre TODAS as ementas do banco
# (full-scan da tabela proposicao) e seria executado imediatamente no boot, causando
# um pico de RAM no container de 512 MB. É computado lazily na primeira requisição
# e cacheado normalmente a partir daí.
WARMUP = [
    ("q2:partidos",          _get_partidos),
    ("q2:ranking-temas:all", lambda: _compute_ranking_temas(None)),
]
