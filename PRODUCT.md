# PRODUCT — Painel de Análise da Câmara dos Deputados

**Register:** product (design serve à tarefa — dashboard analítico).

## O que é
Painel web (React + Vite + Chart.js) que responde a 7 perguntas analíticas sobre
dados públicos da Câmara dos Deputados (legislatura 2023–2026): gastos da CEAP,
eixos de atuação legislativa, padrão de votação, escolaridade, fornecedores,
correlação escolaridade × comportamento, e influência parlamentar. Trabalho da
disciplina BDR (Grupo 7). Front-end em `front-end/`, consome um back-end FastAPI
em `localhost:8000` via proxy do Vite (`/q1`…`/q7`).

## Público
- **Avaliadores / colegas (acadêmico):** querem entender rapidamente o que cada
  análise mostra e a metodologia por trás.
- **Curiosos de dados públicos / transparência:** exploram rankings, ordenam e
  filtram tabelas, abrem o detalhamento de um deputado.

## Princípios
- **Confiança pelo método:** cada aba traz uma nota de metodologia explicando a
  origem e o cálculo do dado. É o diferencial — manter sempre.
- **Operável:** tabelas grandes precisam de ordenação e busca; nada de rolar 200
  linhas no olho.
- **Honesto nos estados:** carregando, erro e vazio são sempre visíveis — nunca
  tela em branco.
- **Acessível:** tudo que clica também funciona por teclado, com foco visível.

## Não-objetivos
- Não é ferramenta de edição/escrita: é leitura e exploração de dados.
- Sem autenticação, sem multiusuário, sem persistência de preferências.
