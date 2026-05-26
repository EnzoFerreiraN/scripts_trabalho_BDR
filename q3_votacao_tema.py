"""
Pergunta 3: Como um deputado votou em um tema/eixo específico.

Uso:
    python q3_votacao_tema.py
    python q3_votacao_tema.py 204554 "Economia"
    python q3_votacao_tema.py 73701 "Segurança"

O ID do deputado pode ser obtido via q1_gastos_deputados.py ou q2_eixo_atuacao.py.
"""

import sqlite3
import sys

##DB = "camara.db"
DB = "camara-2023-2026.db"

SQL_VOTOS = """
SELECT
    d.nome                    AS deputado,
    d.id                      AS deputado_id,
    v.deputado_siglaPartido   AS partido,
    v.deputado_siglaUf        AS uf,
    t.tema,
    v.voto,
    COUNT(*)                  AS num_votos
FROM voto v
JOIN deputado d  ON d.id           = v.deputado_id
JOIN pauta p     ON p.idVotacao    = v.idVotacao
JOIN classificacao c ON c.idProposicao = p.proposicao_id
JOIN tema t      ON t.codTema      = c.codTema
WHERE d.id       = :dep_id
  AND t.tema     LIKE :tema
GROUP BY d.id, d.nome, t.codTema, v.voto
ORDER BY d.nome, t.tema, num_votos DESC;
"""

SQL_RESUMO = """
SELECT
    d.nome,
    d.id,
    t.tema,
    v.voto,
    COUNT(*) AS num_votos,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY d.id, t.codTema), 1) AS pct
FROM voto v
JOIN deputado d      ON d.id           = v.deputado_id
JOIN pauta p         ON p.idVotacao    = v.idVotacao
JOIN classificacao c ON c.idProposicao = p.proposicao_id
JOIN tema t          ON t.codTema      = c.codTema
WHERE d.id   = :dep_id
  AND t.tema LIKE :tema
GROUP BY d.id, t.codTema, v.voto
ORDER BY d.nome, t.tema, num_votos DESC;
"""

SQL_TEMAS = "SELECT codTema, tema FROM tema ORDER BY tema;"

def listar_temas(conn):
    cur = conn.cursor()
    cur.execute(SQL_TEMAS)
    print("\nTemas disponíveis:")
    for cod, tema in cur.fetchall():
        print(f"  [{cod:>3}] {tema}")

def main():
    dep_id_arg = sys.argv[1] if len(sys.argv) > 1 else None
    tema_filtro = sys.argv[2] if len(sys.argv) > 2 else None

    conn = sqlite3.connect(DB)

    if not dep_id_arg or not tema_filtro:
        listar_temas(conn)
        print("\nUso: python q3_votacao_tema.py <id_deputado> \"<parte do tema>\"")
        print("Exemplo: python q3_votacao_tema.py 204554 \"Economia\"")
        print("(use q1_gastos_deputados.py ou q2_eixo_atuacao.py para obter o ID)")
        conn.close()
        return

    try:
        dep_id = int(dep_id_arg)
    except ValueError:
        print(f"Erro: '{dep_id_arg}' não é um ID válido. Informe o ID numérico do deputado.")
        conn.close()
        return

    params = {"dep_id": dep_id, "tema": f"%{tema_filtro}%"}

    cur = conn.cursor()
    cur.execute(SQL_RESUMO, params)
    rows = cur.fetchall()
    conn.close()

    if not rows:
        print(f"Nenhum resultado para deputado ID={dep_id} e tema='{tema_filtro}'.")
        return

    print(f"\nVotos do deputado ID={dep_id} no tema '{tema_filtro}':")
    print()

    deputado_atual = None
    tema_atual = None
    for nome, dep_id_row, tema, tipo_voto, num_votos, pct in rows:
        if (nome, tema) != (deputado_atual, tema_atual):
            print(f"\n  {nome} [ID: {dep_id_row}] — {tema}")
            print(f"  {'Voto':<30} {'Qtd':>6} {'%':>7}")
            print(f"  {'-'*45}")
            deputado_atual, tema_atual = nome, tema
        print(f"  {tipo_voto or '(sem registro)':<30} {num_votos:>6,} {pct:>6.1f}%")

if __name__ == "__main__":
    main()
