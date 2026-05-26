"""
Pergunta 2: Agrupar deputados por eixo de atuação (temas das proposições de sua autoria).
Exibe o tema dominante por deputado e o ranking de temas geral.
"""

import sqlite3

##DB = "camara.db"
DB = "camara-2023-2026.db"

# Distribuição de temas por deputado (top tema por deputado)
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
LIMIT 50;
"""

# Ranking geral: quantas proposições (de autoria de algum deputado) existem por tema
SQL_RANKING_TEMAS = """
SELECT
    t.tema,
    COUNT(DISTINCT a.idProposicao) AS num_proposicoes,
    COUNT(DISTINCT a.idDeputadoAutor) AS num_deputados
FROM tema t
JOIN classificacao c ON c.codTema         = t.codTema
JOIN autoria a       ON a.idProposicao    = c.idProposicao
WHERE a.idDeputadoAutor IS NOT NULL
GROUP BY t.codTema, t.tema
ORDER BY num_proposicoes DESC;
"""

def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    print("=" * 70)
    print("RANKING GERAL DE TEMAS (proposições com autoria de deputado)")
    print("=" * 70)
    cur.execute(SQL_RANKING_TEMAS)
    rows = cur.fetchall()
    print(f"{'#':>3}  {'Tema':<45} {'Proposições':>12} {'Deputados':>10}")
    print("-" * 74)
    for i, (tema, n_prop, n_dep) in enumerate(rows, 1):
        print(f"{i:>3}  {tema:<45} {n_prop:>12,} {n_dep:>10,}")

    print()
    print("=" * 70)
    print("TEMA DOMINANTE POR DEPUTADO (top 50 por volume)")
    print("=" * 70)
    cur.execute(SQL_POR_DEPUTADO)
    rows = cur.fetchall()
    print(f"{'#':>3}  {'ID':>8}  {'Deputado':<45} {'Tema Principal':<35} {'Proposições':>12}")
    print("-" * 108)
    for i, (dep_id, nome, tema, n_prop) in enumerate(rows, 1):
        print(f"{i:>3}  {dep_id:>8}  {nome:<45} {tema:<35} {n_prop:>12,}")

    conn.close()

if __name__ == "__main__":
    main()
