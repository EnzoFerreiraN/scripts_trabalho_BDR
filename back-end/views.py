"""
SQL Views criadas no startup da API para evitar repetição de lógica complexa
nos routers. Todas usam CREATE VIEW IF NOT EXISTS — idempotentes.
"""

DDL_VIEWS = [
    # I3a ── população canônica: deputados com gasto na legislatura 2023-2026
    """
CREATE VIEW IF NOT EXISTS vw_deputado_atual AS
SELECT DISTINCT idDeCadastro AS id FROM gasto;
""",
    # I3b ── total de gastos por deputado com partido/UF da transação mais recente
    """
CREATE VIEW IF NOT EXISTS vw_gasto_deputado AS
WITH agg AS (
    SELECT idDeCadastro AS id,
           COUNT(ideDocumento)        AS num_transacoes,
           ROUND(SUM(vlrLiquido), 2)  AS total_gasto
    FROM gasto
    WHERE vlrLiquido > 0
    GROUP BY idDeCadastro
),
recente AS (
    SELECT idDeCadastro AS id, sgPartido, sgUF,
           ROW_NUMBER() OVER (
               PARTITION BY idDeCadastro
               ORDER BY numAno DESC, numMes DESC, ideDocumento DESC
           ) AS rn
    FROM gasto
    WHERE vlrLiquido > 0
)
SELECT a.id, r.sgPartido AS partido, r.sgUF AS uf, a.num_transacoes, a.total_gasto
FROM agg a
JOIN recente r ON r.id = a.id AND r.rn = 1;
""",
    # I1 ── escolaridade normalizada em 5 buckets ordinais
    #   0 Sem informação  1 Fundamental  2 Médio  3 Superior  4 Pós-graduação
    """
CREATE VIEW IF NOT EXISTS vw_escolaridade_norm AS
SELECT
    id AS dep_id,
    CASE
        WHEN escolaridade IS NULL
             THEN 'Sem informação'
        WHEN escolaridade IN (
             'Primário', 'Primário Incompleto', 'Ginasial',
             'Ensino Fundamental', 'Ensino Fundamental Incompleto')
             THEN 'Fundamental'
        WHEN escolaridade IN (
             'Secundário', 'Secundário Incompleto',
             'Ensino Médio', 'Ensino Médio Incompleto',
             'Ensino Técnico', 'Superior Incompleto')
             THEN 'Médio'
        WHEN escolaridade IN (
             'Superior', 'Mestrado Incompleto', 'Doutorado Incompleto')
             THEN 'Superior'
        WHEN escolaridade IN ('Pós-Graduação', 'Mestrado', 'Doutorado')
             THEN 'Pós-graduação'
        ELSE 'Superior'
    END AS escolaridade,
    CASE
        WHEN escolaridade IS NULL
             THEN 0
        WHEN escolaridade IN (
             'Primário', 'Primário Incompleto', 'Ginasial',
             'Ensino Fundamental', 'Ensino Fundamental Incompleto')
             THEN 1
        WHEN escolaridade IN (
             'Secundário', 'Secundário Incompleto',
             'Ensino Médio', 'Ensino Médio Incompleto',
             'Ensino Técnico', 'Superior Incompleto')
             THEN 2
        WHEN escolaridade IN (
             'Superior', 'Mestrado Incompleto', 'Doutorado Incompleto')
             THEN 3
        WHEN escolaridade IN ('Pós-Graduação', 'Mestrado', 'Doutorado')
             THEN 4
        ELSE 3
    END AS escolaridade_ord
FROM deputado;
""",
    # I2 ── influência ponderada: peso por autoria (ordemAssinatura/proponente)
    #   × margem de aprovação (votosSim/total), normalizado 0-100
    """
CREATE VIEW vw_influencia AS
WITH plen_aprovadas AS (
    SELECT DISTINCT p.proposicao_id,
           COALESCE(
               ROUND(1.0 * v.votosSim / NULLIF(v.votosSim + v.votosNao, 0), 3),
               0.5
           ) AS margem
    FROM pauta p
    JOIN votacao v ON v.id = p.idVotacao
    WHERE v.siglaOrgao = 'PLEN' AND v.aprovacao = 1
),
dep_pauta AS (
    SELECT a.idDeputadoAutor AS dep_id,
           COUNT(DISTINCT p.proposicao_id) AS em_pauta_plen
    FROM autoria a
    JOIN pauta p   ON p.proposicao_id = a.idProposicao
    JOIN votacao v ON v.id = p.idVotacao
    WHERE a.idDeputadoAutor IS NOT NULL AND v.siglaOrgao = 'PLEN'
    GROUP BY a.idDeputadoAutor
),
dep_score AS (
    SELECT a.idDeputadoAutor AS dep_id,
           COUNT(DISTINCT a.idProposicao) AS aprovadas_pelo_dep,
           ROUND(SUM(
               CASE WHEN a.ordemAssinatura <= 1 OR a.proponente = 1 THEN 1.0
                    ELSE 1.0 / a.ordemAssinatura END
               * pa.margem
           ), 3) AS score_ponderado
    FROM autoria a
    JOIN plen_aprovadas pa ON pa.proposicao_id = a.idProposicao
    WHERE a.idDeputadoAutor IS NOT NULL
    GROUP BY a.idDeputadoAutor
),
dep_partido AS (
    SELECT deputado_id, deputado_siglaPartido AS partido, deputado_siglaUf AS uf
    FROM voto
    WHERE (deputado_id, dataHoraVoto) IN (
        SELECT deputado_id, MAX(dataHoraVoto) FROM voto GROUP BY deputado_id
    )
),
total AS (SELECT COUNT(*) AS total_aprovadas FROM plen_aprovadas),
scored AS (
    SELECT
        d.id,
        d.nome,
        d.urlFoto,
        COALESCE(pp.partido, '?')                              AS partido,
        COALESCE(pp.uf, '?')                                   AS uf,
        COALESCE(dp.em_pauta_plen, 0)                          AS em_pauta_plen,
        COALESCE(ds.aprovadas_pelo_dep, 0)                     AS aprovadas_pelo_dep,
        ROUND(100.0 * COALESCE(ds.aprovadas_pelo_dep, 0)
              / NULLIF(COALESCE(dp.em_pauta_plen, 0), 0), 1)   AS taxa_aprovacao,
        t.total_aprovadas,
        COALESCE(ds.score_ponderado, 0.0)                      AS score_ponderado
    FROM deputado d
    LEFT JOIN dep_score   ds ON ds.dep_id      = d.id
    LEFT JOIN dep_pauta   dp ON dp.dep_id      = d.id
    LEFT JOIN dep_partido pp ON pp.deputado_id = d.id
    CROSS JOIN total t
    WHERE COALESCE(ds.aprovadas_pelo_dep, 0) > 0
)
SELECT
    id, nome, urlFoto, partido, uf,
    em_pauta_plen, aprovadas_pelo_dep, taxa_aprovacao, total_aprovadas,
    score_ponderado,
    ROUND(
        100.0 * (
            0.7 * score_ponderado / MAX(score_ponderado) OVER () +
            0.3 * CAST(aprovadas_pelo_dep AS REAL) / NULLIF(em_pauta_plen, 0)
        ),
        2
    ) AS pct_influencia
FROM scored;
""",
]


def init_views(conn) -> None:
    """Create all views at API startup.
    vw_influencia and vw_gasto_deputado are dropped first so definition changes
    always take effect. The remaining views use IF NOT EXISTS.
    """
    cur = conn.cursor()
    cur.execute("DROP VIEW IF EXISTS vw_influencia")
    cur.execute("DROP VIEW IF EXISTS vw_gasto_deputado")
    for ddl in DDL_VIEWS:
        cur.execute(ddl)
    conn.commit()
