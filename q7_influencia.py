"""
Pergunta 7: Ordenar deputados por influência.
Influência = % das propostas aprovadas no plenário que o deputado é autor.
O denominador é o total de proposições distintas aprovadas no plenário (siglaOrgao = 'PLEN').
"""

import sqlite3

DB = "camara-2023-2026.db"

SQL = """
WITH plen_aprovadas AS (
    SELECT DISTINCT p.proposicao_id
    FROM pauta p
    JOIN votacao v ON v.id = p.idVotacao
    WHERE v.siglaOrgao = 'PLEN'
      AND v.aprovacao  = 1
),
total AS (
    SELECT COUNT(*) AS total_aprovadas FROM plen_aprovadas
),
dep_aprovadas AS (
    SELECT
        a.idDeputadoAutor                   AS dep_id,
        COUNT(DISTINCT a.idProposicao)      AS aprovadas_pelo_dep
    FROM autoria a
    JOIN plen_aprovadas pa ON pa.proposicao_id = a.idProposicao
    WHERE a.idDeputadoAutor IS NOT NULL
    GROUP BY a.idDeputadoAutor
),
dep_pauta AS (
    SELECT
        a.idDeputadoAutor                   AS dep_id,
        COUNT(DISTINCT p.proposicao_id)     AS em_pauta_plen
    FROM autoria a
    JOIN pauta p    ON p.proposicao_id = a.idProposicao
    JOIN votacao v  ON v.id = p.idVotacao
    WHERE a.idDeputadoAutor IS NOT NULL
      AND v.siglaOrgao = 'PLEN'
    GROUP BY a.idDeputadoAutor
),
dep_partido AS (
    -- partido mais recente do deputado (pelo voto mais recente)
    SELECT deputado_id, deputado_siglaPartido AS partido, deputado_siglaUf AS uf
    FROM voto
    WHERE (deputado_id, dataHoraVoto) IN (
        SELECT deputado_id, MAX(dataHoraVoto)
        FROM voto
        GROUP BY deputado_id
    )
)
SELECT
    d.nome,
    COALESCE(pp.partido, '?')               AS partido,
    COALESCE(pp.uf, '?')                    AS uf,
    COALESCE(dp.em_pauta_plen, 0)           AS em_pauta_plen,
    COALESCE(da.aprovadas_pelo_dep, 0)      AS aprovadas_pelo_dep,
    ROUND(
        100.0 * COALESCE(da.aprovadas_pelo_dep, 0)
              / NULLIF(COALESCE(dp.em_pauta_plen, 0), 0),
        1
    )                                        AS taxa_aprovacao,
    t.total_aprovadas,
    ROUND(
        100.0 * COALESCE(da.aprovadas_pelo_dep, 0) / t.total_aprovadas,
        2
    )                                        AS pct_influencia
FROM deputado d
LEFT JOIN dep_aprovadas da ON da.dep_id = d.id
LEFT JOIN dep_pauta     dp ON dp.dep_id = d.id
LEFT JOIN dep_partido   pp ON pp.deputado_id = d.id
CROSS JOIN total t
WHERE COALESCE(da.aprovadas_pelo_dep, 0) > 0
ORDER BY pct_influencia DESC
LIMIT 30;
"""


def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute(SQL)
    rows = cur.fetchall()
    conn.close()

    if not rows:
        print("Nenhum resultado encontrado.")
        return

    total_plen = rows[0][6]
    print("=" * 80)
    print("DEPUTADOS COM MAIOR INFLUÊNCIA NO PLENÁRIO (2023-2026)")
    print("=" * 80)
    print(f"  Base de cálculo: {total_plen:,} proposições distintas aprovadas no Plenário")
    print(f"  Influência      = propostas do deputado aprovadas / total aprovado no Plenário")
    print(f"  Taxa aprovação  = propostas do dep. aprovadas / propostas do dep. em pauta")
    print("=" * 80)
    print()

    # cabeçalho
    print(f"{'#':>3}  {'Deputado':<38} {'Partido/UF':<12} "
          f"{'Em Pauta':>9} {'Aprovadas':>10} {'Taxa Aprov.':>11} {'Influência':>11}")
    print("-" * 98)

    for i, (nome, partido, uf, em_pauta, aprovadas, taxa, _total, pct) in enumerate(rows, 1):
        partido_uf = f"{partido}/{uf}"
        taxa_str = f"{taxa:.1f}%" if taxa is not None else "  -"
        print(
            f"{i:>3}  {nome:<38} {partido_uf:<12} "
            f"{em_pauta:>9,} {aprovadas:>10,} {taxa_str:>11} {pct:>10.2f}%"
        )
        if i % 10 == 0 and i < len(rows):
            print()

    print()
    print(f"  Top 1 concentra {rows[0][7]:.2f}% de todas as aprovações do Plenário.")


if __name__ == "__main__":
    main()
