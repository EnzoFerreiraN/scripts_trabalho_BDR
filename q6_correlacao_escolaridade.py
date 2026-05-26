"""
Pergunta 6: Correlacionar escolaridade com:
  a) Gastos
  b) Fidelidade Partidária
  c) Nº de proposições
  d) Presença em eventos
  e) Presença no plenário (Sessão Deliberativa)
"""

import sqlite3

DB = "camara-2023-2026.db"

# --- 6a ---
SQL_6A = """
SELECT
    d.escolaridade                                              AS escolaridade,
    COUNT(DISTINCT d.id)                                        AS num_deputados,
    ROUND(SUM(g.vlrLiquido), 2)                                 AS total_gasto,
    ROUND(SUM(g.vlrLiquido) / COUNT(DISTINCT d.id), 2)         AS media_gasto_por_deputado,
    ROUND(AVG(g.vlrLiquido), 2)                                 AS media_por_transacao
FROM deputado d
JOIN gasto g ON g.idDeCadastro = d.id
WHERE d.escolaridade IS NOT NULL
GROUP BY d.escolaridade
ORDER BY media_gasto_por_deputado DESC;
"""

# --- 6b ---
# Fidelidade = votos onde o deputado seguiu a orientação do seu partido.
# Exclui votos com orientação 'Liberado' (partido deixou livre).
SQL_6B = """
SELECT
    d.escolaridade                                                      AS escolaridade,
    COUNT(DISTINCT d.id)                                                AS num_deputados,
    COUNT(*)                                                            AS votos_com_orientacao,
    SUM(CASE WHEN v.voto = o.orientacao THEN 1 ELSE 0 END)             AS votos_fieis,
    ROUND(
        100.0 * SUM(CASE WHEN v.voto = o.orientacao THEN 1 ELSE 0 END)
              / COUNT(*),
        2
    )                                                                   AS pct_fidelidade
FROM voto v
JOIN deputado d  ON d.id           = v.deputado_id
JOIN orientacao o ON o.idVotacao   = v.idVotacao
                 AND o.siglaBancada = v.deputado_siglaPartido
WHERE d.escolaridade    IS NOT NULL
  AND o.orientacao      IS NOT NULL
  AND o.orientacao      != 'Liberado'
  AND v.voto            IS NOT NULL
GROUP BY d.escolaridade
ORDER BY pct_fidelidade DESC;
"""

# --- 6c ---
SQL_6C = """
SELECT
    d.escolaridade                                              AS escolaridade,
    COUNT(DISTINCT d.id)                                        AS num_deputados,
    COUNT(a.idProposicao)                                       AS total_proposicoes,
    ROUND(1.0 * COUNT(a.idProposicao) / COUNT(DISTINCT d.id), 1) AS media_por_deputado
FROM deputado d
LEFT JOIN autoria a ON a.idDeputadoAutor = d.id
WHERE d.escolaridade IS NOT NULL
GROUP BY d.escolaridade
ORDER BY media_por_deputado DESC;
"""

# --- 6d ---
SQL_6D = """
SELECT
    d.escolaridade                                              AS escolaridade,
    COUNT(DISTINCT d.id)                                        AS num_deputados,
    COUNT(p.idEvento)                                           AS total_presencas,
    ROUND(1.0 * COUNT(p.idEvento) / COUNT(DISTINCT d.id), 1)   AS media_por_deputado
FROM deputado d
LEFT JOIN presenca p ON p.idDeputado = d.id
WHERE d.escolaridade IS NOT NULL
GROUP BY d.escolaridade
ORDER BY media_por_deputado DESC;
"""

# --- 6e ---
# Plenário = eventos do tipo 'Sessão Deliberativa'
SQL_6E = """
SELECT
    d.escolaridade                                              AS escolaridade,
    COUNT(DISTINCT d.id)                                        AS num_deputados,
    COUNT(pp.idEvento)                                          AS total_presencas_plenario,
    ROUND(1.0 * COUNT(pp.idEvento) / COUNT(DISTINCT d.id), 1)  AS media_por_deputado
FROM deputado d
LEFT JOIN (
    SELECT p.idDeputado, p.idEvento
    FROM presenca p
    JOIN evento e ON e.id = p.idEvento
    WHERE e.descricaoTipo = 'Sessão Deliberativa'
) pp ON pp.idDeputado = d.id
WHERE d.escolaridade IS NOT NULL
GROUP BY d.escolaridade
ORDER BY media_por_deputado DESC;
"""

def print_section(titulo, header, rows, fmt):
    print(f"\n{'='*70}")
    print(titulo)
    print("=" * 70)
    print(header)
    print("-" * len(header))
    for row in rows:
        print(fmt(row))

def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    # 6a
    cur.execute(SQL_6A)
    rows = cur.fetchall()
    header = f"{'Escolaridade':<30} {'Deputados':>10} {'Total Gasto (R$)':>18} {'Média/Dep (R$)':>16} {'Média/Trans (R$)':>16}"
    print_section(
        "6a) ESCOLARIDADE × GASTOS",
        header,
        rows,
        lambda r: f"{r[0]:<30} {r[1]:>10,} {r[2]:>18,.2f} {r[3]:>16,.2f} {r[4]:>16,.2f}"
    )

    # 6b
    cur.execute(SQL_6B)
    rows = cur.fetchall()
    header = f"{'Escolaridade':<30} {'Deputados':>10} {'Votos c/ Orientação':>20} {'Votos Fiéis':>12} {'% Fidelidade':>13}"
    print_section(
        "6b) ESCOLARIDADE × FIDELIDADE PARTIDÁRIA",
        header,
        rows,
        lambda r: f"{r[0]:<30} {r[1]:>10,} {r[2]:>20,} {r[3]:>12,} {r[4]:>12.2f}%"
    )

    # 6c
    cur.execute(SQL_6C)
    rows = cur.fetchall()
    header = f"{'Escolaridade':<30} {'Deputados':>10} {'Total Proposições':>18} {'Média/Dep':>10}"
    print_section(
        "6c) ESCOLARIDADE × Nº DE PROPOSIÇÕES",
        header,
        rows,
        lambda r: f"{r[0]:<30} {r[1]:>10,} {r[2]:>18,} {r[3]:>10.1f}"
    )

    # 6d
    cur.execute(SQL_6D)
    rows = cur.fetchall()
    header = f"{'Escolaridade':<30} {'Deputados':>10} {'Total Presenças':>16} {'Média/Dep':>10}"
    print_section(
        "6d) ESCOLARIDADE × PRESENÇA EM EVENTOS",
        header,
        rows,
        lambda r: f"{r[0]:<30} {r[1]:>10,} {r[2]:>16,} {r[3]:>10.1f}"
    )

    # 6e
    cur.execute(SQL_6E)
    rows = cur.fetchall()
    header = f"{'Escolaridade':<30} {'Deputados':>10} {'Presenças Plenário':>19} {'Média/Dep':>10}"
    print_section(
        "6e) ESCOLARIDADE × PRESENÇA NO PLENÁRIO (Sessão Deliberativa)",
        header,
        rows,
        lambda r: f"{r[0]:<30} {r[1]:>10,} {r[2]:>19,} {r[3]:>10.1f}"
    )

    conn.close()

if __name__ == "__main__":
    main()
