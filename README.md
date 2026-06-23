# Dossiê Grupo 7

## Arquitetura

```
projeto final/
├── back-end/        # API REST — FastAPI + SQLite
│   ├── main.py      # /health, warm-up de cache no startup, CORS
│   ├── database.py  # DB_PATH, conexão somente leitura, PRAGMAs de memória
│   ├── schemas.py
│   ├── views.py     # SQL Views criadas no startup (vw_deputado_atual, vw_gasto_deputado, vw_escolaridade_norm, vw_influencia)
│   ├── cache.py     # Cache TTL em memória para queries pesadas
│   ├── stopwords_pt.py  # Stopwords PT-BR da nuvem de palavras das ementas
│   └── routers/     # q1_gastos … q8_deputado
├── front-end/       # Dashboard — React + Vite
│   ├── src/
│   │   ├── App.jsx       # 4 dashboards: Visão Geral (Q8) · Gastos & Fornecedores (Q1 Q5) · Atuação & Influência (Q2 Q3 Q7) · Escolaridade & Perfil (Q4 Q6)
│   │   ├── components/   # Q1–Q8, shared (Modal, DataTable, Avatar, Badge…)
│   │   ├── lib/          # api.js, formatters.js, chartDefaults.js, stats.js
│   │   └── styles/
│   └── package.json
└── requirements.txt
```

O back-end serve **exclusivamente** a API REST (porta 8000). O front-end é um projeto React independente servido pelo Vite (porta 5173) em desenvolvimento; em produção gera-se o build estático na pasta `dist/` com `npm run build`.

---

## Como Rodar o Projeto

### Pré-requisitos

- Python 3.10+
- Node.js 18+
- O banco de dados `camara-2023-2026.db` na raiz do projeto (ver [Gerando o banco do zero](#gerando-o-banco-do-zero)). O caminho pode ser sobrescrito pela env var `DB_PATH`; a conexão é sempre somente leitura.

### 1. Instalar dependências

**Back-end:**
```bash
pip install -r requirements.txt
```

**Front-end:**
```bash
cd front-end
npm install
```

### 2. Iniciar o back-end

A partir da pasta `back-end/`:

```bash
cd back-end
uvicorn main:app --reload
```

A API sobe em **http://localhost:8000**.  
Documentação interativa: **http://localhost:8000/docs**

### 3. Iniciar o front-end

Em outro terminal, a partir da pasta `front-end/`:

```bash
cd front-end
npm run dev
```

O dashboard abre em **http://localhost:5173**.

> O Vite encaminha automaticamente as chamadas `/q1` … `/q8` para o FastAPI via proxy configurado em `vite.config.js` — não é necessário alterar nenhuma URL.

### Build de produção

```bash
cd front-end
npm run build
# Os arquivos estáticos ficam em front-end/dist/
```

---

## Gerando o banco do zero

O banco `camara-2023-2026.db` (~810 MB) **não é versionado** no Git. Para gerá-lo a partir dos dados abertos da Câmara:

### 1. Preparar os CSVs (download + limpeza)

```bash
python baixar_dados.py
```

Script unificado que executa quatro etapas em sequência:

1. **CSVs anuais** — baixa de `dadosabertos.camara.leg.br` os 9 conjuntos anuais (2023–2026) para subpastas de `dados/`: `eventos`, `votacoes`, `proposicoes`, `proposicoesTemas`, `votacoesOrientacoes`, `eventosPresencaDeputados`, `votacoesVotos`, `votacoesProposicoes` e `proposicoesAutores`.
2. **Gastos CEAP** — baixa `Ano-AAAA.csv.zip` de `camara.leg.br/cotas` e extrai o CSV em `dados/gastos/` para cada ano.
3. **Limpeza de `dados/deputados.csv`** — garante coluna `id` (derivada da `uri` se ausente) e preenche `urlFoto` com o link bandep fixo para todos os deputados.
4. **Limpeza de `proposicoesTemas`** — adiciona coluna `idProposicao` (derivada de `uriProposicao`) em cada `proposicoesTemas-*.csv`.

Arquivos já baixados são pulados (idempotente). Requer internet; pode levar vários minutos.

> **Escolaridade:** o campo `escolaridade` em `dados/deputados.csv` não é coberto por `baixar_dados.py` — use `scripts_limpeza/add_esc_photo.py` para preencher consultando a API da Câmara por deputado (requer internet, pode ser lento).

### 2. Rodar o ETL

```bash
python etl-2023-2026.py
```

Aplica o `schema.sql` (13 tabelas + 13 índices) e carrega todos os CSVs no banco via `INSERT OR IGNORE` — o script é **idempotente** e pode ser re-executado para completar cargas parciais. Ao final imprime a contagem de linhas por tabela e grava o log em `etl_log.txt`.

> Use `etl-2023-2026.py`. Para preencher ou atualizar `escolaridade` e `urlFoto` nos dados de deputados, use `scripts_limpeza/add_esc_photo.py` (consulta a API da Câmara por deputado).

As 4 views SQL (`vw_deputado_atual`, `vw_gasto_deputado`, `vw_escolaridade_norm`, `vw_influencia`) **não** fazem parte do ETL — são criadas automaticamente pelo back-end no startup (`init_views()`).

---

## Views SQL

Ao subir, a API executa `init_views()` (`back-end/views.py`) que cria quatro views SQLite reutilizadas em quase todos os endpoints:

| View | Descrição |
|---|---|
| `vw_deputado_atual` | População canônica — deputados com ao menos um registro de gasto na legislatura 2023–2026 (~844 deputados). |
| `vw_gasto_deputado` | Totalização de gastos por deputado (`SUM(vlrLiquido)`, `COUNT(ideDocumento)`) com partido e UF inferidos do lançamento mais recente. |
| `vw_escolaridade_norm` | Escolaridade normalizada em 5 buckets ordinais: **0** Sem informação · **1** Fundamental · **2** Médio · **3** Superior · **4** Pós-graduação. Base de todos os agrupamentos do Q4 e Q6. |
| `vw_influencia` | Score de influência ponderado por autoria e margem de aprovação (ver Q7). Recriada a cada startup via `DROP VIEW IF EXISTS` + `CREATE VIEW` para que alterações de fórmula entrem em vigor imediatamente. As demais views usam `CREATE VIEW IF NOT EXISTS`. |



## Diagrama Entidade Relacionamento

```mermaid
erDiagram
    DEPUTADO ||--o{ GASTO : "realiza (1:n)"
    DEPUTADO }o--o{ EVENTO : "presença (n:n)"
    DEPUTADO }o--o{ VOTACAO : "voto (n:n)"
    DEPUTADO }o--o{ PROPOSICAO : "autoria (n:n)"
    EVENTO ||--o{ VOTACAO : "tem (1:n)"
    VOTACAO }o--o{ PROPOSICAO : "pauta (n:n)"
    VOTACAO }o--o{ BANCADA : "orienta (n:n)"
    PROPOSICAO }o--o{ TEMA : "classifica (n:n)"

    DEPUTADO {
        INTEGER id PK "Identificador numérico único do deputado"
        VARCHAR uri "Endereço completo do recurso na API"
        VARCHAR nome "Nome parlamentar adotado na legislatura"
        INTEGER idLegislaturaInicial "Primeira legislatura do deputado"
        INTEGER idLegislaturaFinal "Última legislatura (ou atual)"
        VARCHAR nomeCivil "Nome civil completo"
        VARCHAR cpf "CPF sem pontuação"
        CHAR siglaSexo "Sexo do parlamentar"
        VARCHAR urlRedeSocial "URLs de redes sociais"
        VARCHAR urlWebsite "Site pessoal do deputado"
        DATE dataNascimento "Data de nascimento"
        DATE dataFalecimento "Data de falecimento, se aplicável"
        CHAR ufNascimento "UF onde o deputado nasceu"
        VARCHAR municipioNascimento "Cidade de nascimento"
        VARCHAR escolaridade "Grau de escolaridade autodeclarado"
        VARCHAR urlFoto "Endereço para a foto do deputado"
    }

    GASTO {
        INTEGER ideDocumento PK "Identificador interno do documento comprobatório"
        INTEGER idDeCadastro FK "Identificador de cadastro do deputado (FK → deputado.id)"
        VARCHAR txNomeParlamentar "Nome do parlamentar ou órgão beneficiário"
        VARCHAR cpf "CPF do parlamentar beneficiário"
        INTEGER nuDeputadoId "Identificador do deputado que realizou a despesa"
        INTEGER nuCarteiraParlamentar "Número da carteira parlamentar"
        INTEGER nuLegislatura "Número da legislatura do gasto"
        CHAR sgUF "UF do deputado no momento da despesa"
        VARCHAR sgPartido "Partido do deputado no momento da despesa"
        INTEGER codLegislatura "Código numérico da legislatura"
        INTEGER numSubCota "Código da categoria de despesa"
        VARCHAR txtDescricao "Descrição da categoria de despesa CEAP"
        INTEGER numEspecificacaoSubCota "Código de especificação adicional"
        VARCHAR txtDescricaoEspecificacao "Descrição da especificação da subcota"
        VARCHAR txtFornecedor "Nome do fornecedor conforme nota fiscal"
        VARCHAR txtCNPJCPF "CNPJ ou CPF do fornecedor"
        VARCHAR txtNumero "Número do documento fiscal"
        INTEGER indTipoDocumento "Tipo de documento"
        DATETIME datEmissao "Data de emissão do documento fiscal"
        DECIMAL vlrDocumento "Valor de face do documento"
        DECIMAL vlrGlosa "Valor retido não coberto pela CEAP"
        DECIMAL vlrLiquido "Valor efetivamente debitado da cota"
        INTEGER numMes "Mês de competência financeira"
        INTEGER numAno "Ano de competência financeira"
        INTEGER numParcela "Número da parcela"
        VARCHAR txtPassageiro "Nome do passageiro em viagem"
        VARCHAR txtTrecho "Trecho da viagem (padrão IATA)"
        INTEGER numLote "Número do lote de processamento"
        INTEGER numRessarcimento "Número do ressarcimento no lote"
        DATETIME datPagamentoRestituicao "Data de pagamento de restituição"
        DECIMAL vlrRestituicao "Valor devolvido à Câmara"
        VARCHAR urlDocumento "Link para o PDF da despesa"
    }

    EVENTO {
        INTEGER id PK "Identificador único do evento"
        VARCHAR uri "URI do evento na API"
        VARCHAR urlDocumentoPauta "URL da pauta em PDF"
        DATETIME dataHoraInicio "Data e hora de início"
        DATETIME dataHoraFim "Data e hora de encerramento"
        VARCHAR situacao "Status do evento"
        TEXT descricao "Descrição ou pauta do evento"
        VARCHAR descricaoTipo "Tipo do evento"
        VARCHAR localExterno "Local externo ao complexo da Câmara"
        VARCHAR localCamara_nome "Nome do local dentro da Câmara"
        VARCHAR localCamara_predio "Prédio do local"
        VARCHAR localCamara_sala "Sala ou plenário"
        VARCHAR localCamara_andar "Andar do local"
    }

    VOTACAO {
        VARCHAR id PK "Identificador único da votação"
        VARCHAR uri "URI da votação na API"
        DATE data "Data da votação"
        DATETIME dataHoraRegistro "Data e hora exata do registro"
        INTEGER idOrgao "Código do órgão responsável"
        VARCHAR uriOrgao "URI do órgão"
        VARCHAR siglaOrgao "Sigla do órgão"
        INTEGER idEvento FK "Evento/sessão que sediou a votação"
        VARCHAR uriEvento "URI do evento associado"
        INTEGER aprovacao "Resultado da votação"
        INTEGER votosSim "Total de votos 'Sim'"
        INTEGER votosNao "Total de votos 'Não'"
        INTEGER votosOutros "Total de abstenções e outros"
        TEXT descricao "Descrição do objeto votado"
        DATETIME ultimaAberturaVotacao_dataHoraRegistro "Momento da última abertura"
        VARCHAR ultimaAberturaVotacao_descricao "Descrição da última abertura"
        DATETIME ultimaApresentacaoProposicao_dataHoraRegistro "Momento da apresentação"
        TEXT ultimaApresentacaoProposicao_descricao "Descrição da apresentação"
        INTEGER ultimaApresentacaoProposicao_idProposicao "ID da proposição votada"
        VARCHAR ultimaApresentacaoProposicao_uriProposicao "URI da proposição"
    }

    PROPOSICAO {
        INTEGER id PK "Identificador único da proposição"
        VARCHAR uri "URI da proposição na API"
        VARCHAR siglaTipo "Tipo da proposição"
        INTEGER numero "Número sequencial no ano"
        INTEGER ano "Ano de apresentação"
        INTEGER codTipo "Código numérico do tipo"
        VARCHAR descricaoTipo "Descrição textual do tipo"
        TEXT ementa "Ementa resumida da proposição"
        TEXT ementaDetalhada "Ementa detalhada (pode conter HTML)"
        VARCHAR keywords "Palavras-chave separadas por vírgula"
        DATETIME dataApresentacao "Data e hora de apresentação formal"
        VARCHAR uriOrgaoNumerador "URI do órgão numerador"
        VARCHAR uriPropAnterior "URI da proposição anterior"
        VARCHAR uriPropPrincipal "URI da proposição principal"
        VARCHAR uriPropPosterior "URI da proposição posterior"
        VARCHAR urlInteiroTeor "Link para o texto completo"
        VARCHAR urnFinal "URN final da proposição"
        DATETIME ultimoStatus_dataHora "Data/hora do último status"
        INTEGER ultimoStatus_sequencia "Sequência do status"
        VARCHAR ultimoStatus_uriRelator "URI do relator"
        INTEGER ultimoStatus_idOrgao "Código do órgão atual"
        VARCHAR ultimoStatus_siglaOrgao "Sigla do órgão"
        VARCHAR ultimoStatus_uriOrgao "URI do órgão"
        VARCHAR ultimoStatus_regime "Regime de tramitação"
        TEXT ultimoStatus_descricaoTramitacao "Descrição da tramitação"
        INTEGER ultimoStatus_idTipoTramitacao "Código do tipo de tramitação"
        VARCHAR ultimoStatus_descricaoSituacao "Situação atual"
        INTEGER ultimoStatus_idSituacao "Código da situação"
    }

    TEMA {
        INTEGER codTema PK "Código numérico do tema"
        VARCHAR tema "Nome descritivo da área temática"
        INTEGER relevancia "Nível de relevância do tema"
    }

    BANCADA {
        VARCHAR siglaBancada PK "Sigla da bancada ou partido"
        VARCHAR uriBancada "URI da bancada na API"
    }

    PRESENCA {
        INTEGER idEvento FK "Identificador do evento"
        INTEGER idDeputado FK "Identificador do deputado presente"
        DATETIME data "Data/hora do início do evento"
        VARCHAR uriEvento "URI do evento"
        VARCHAR uriDeputado "URI do deputado"
    }

    VOTO {
        VARCHAR idVotacao FK "Votação em que o voto foi registrado"
        INTEGER deputado_id FK "Deputado que emitiu o voto"
        VARCHAR voto "Voto registrado"
        DATETIME dataHoraVoto "Data e hora exata do registro"
        VARCHAR deputado_uri "URI do deputado"
        VARCHAR deputado_nome "Nome do deputado no momento do voto"
        VARCHAR deputado_siglaPartido "Partido no momento do voto"
        CHAR deputado_siglaUf "UF do deputado"
        VARCHAR deputado_urlFoto "URL da foto"
    }

    PAUTA {
        VARCHAR idVotacao FK "Votação que deliberou sobre a proposição"
        INTEGER proposicao_id FK "Proposição que entrou em pauta"
        DATE data "Data da votação"
        VARCHAR descricao "Descrição do objeto votado"
        VARCHAR proposicao_uri "URI da proposição"
        VARCHAR proposicao_titulo "Título da proposição"
        TEXT proposicao_ementa "Ementa da proposição"
        INTEGER proposicao_codTipo "Código do tipo"
        VARCHAR proposicao_siglaTipo "Sigla do tipo"
        INTEGER proposicao_numero "Número da proposição"
        INTEGER proposicao_ano "Ano da proposição"
    }

    ORIENTACAO {
        VARCHAR idVotacao FK "Votação à qual a orientação se refere"
        VARCHAR siglaBancada FK "Bancada que emitiu a orientação"
        VARCHAR uriVotacao "URI da votação"
        VARCHAR siglaOrgao "Órgão onde ocorreu"
        TEXT descricao "Descrição da orientação emitida"
        VARCHAR uriBancada "URI da bancada"
        VARCHAR orientacao "Voto orientado pela liderança"
    }

    AUTORIA {
        INTEGER idProposicao FK "Proposição à qual a autoria pertence"
        INTEGER idDeputadoAutor FK "Deputado que assinou a proposição"
        VARCHAR uriProposicao "URI da proposição"
        VARCHAR uriAutor "URI do autor"
        INTEGER codTipoAutor "Código do tipo de autor"
        VARCHAR tipoAutor "Descrição do tipo de autor"
        VARCHAR nomeAutor "Nome do autor conforme registrado"
        VARCHAR siglaPartidoAutor "Partido do autor na assinatura"
        VARCHAR uriPartidoAutor "URI do partido do autor"
        CHAR siglaUFAutor "UF do autor"
        INTEGER ordemAssinatura "Ordem de assinatura"
        INTEGER proponente "Indicador de proponente"
    }

    CLASSIFICACAO {
        INTEGER idProposicao FK "Proposição classificada no tema"
        INTEGER codTema FK "Código do tema associado"
        VARCHAR uriProposicao "URI da proposição"
        VARCHAR siglaTipo "Tipo da proposição"
        INTEGER numero "Número da proposição"
        INTEGER ano "Ano da proposição"
        INTEGER relevancia "Relevância do tema para esta proposição"
    }
```

> **Nota sobre o diagrama:** os relacionamentos `presença`, `voto`, `autoria`, `pauta`, `orienta` e `classifica` são do tipo muitos-para-muitos (n:n) e, na implementação física, são materializados pelas tabelas associativas `PRESENCA`, `VOTO`, `AUTORIA`, `PAUTA`, `ORIENTACAO` e `CLASSIFICACAO`, respectivamente. O relacionamento `realiza` (Deputado → Gastos) é 1:n, assim como `tem` (Evento → Votacoes).

---

## Dicionário de Dados

### Fonte dos Dados e Arquivos CSV utilizados

API de Dados Abertos da Câmara dos Deputados: <https://dadosabertos.camara.leg.br/swagger/api.html?tab=api>

| Arquivo CSV | Endpoint(s) da API |
|---|---|
| `deputados.csv` | `GET /deputados` · `GET /deputados/{id}` |
| `Ano-AAAA.csv` | `http://www.camara.leg.br/cotas/Ano-{ano}.csv` |
| `eventos-AAAA.csv` | `GET /eventos` · `GET /eventos/{id}` |
| `votacoes-AAAA.csv` | `GET /votacoes` · `GET /votacoes/{id}` |
| `proposicoes-AAAA.csv` | `GET /proposicoes` · `GET /proposicoes/{id}` |
| `proposicoesTemas-AAAA.csv` | `GET /referencias/proposicoes/codTema` |
| `votacoesOrientacoes-AAAA.csv` | `GET /votacoes/{id}/orientacoes` |
| `eventosPresencaDeputados-AAAA.csv` | — |
| `votacoesVotos-AAAA.csv` | `GET /votacoes/{id}/votos` |
| `votacoesProposicoes-AAAA.csv` | `GET /votacoes/{id}/proposicoes` |
| `proposicoesAutores-AAAA.csv` | `GET /proposicoes/{id}/autores` |

---

### DEPUTADO

| Campo | Tipo | Tamanho | Chave | Null? | Descrição |
|---|---|---|---|---|---|
| uri | VARCHAR | 200 |  | NÃO | Endereço completo do recurso na API. |
| nome | VARCHAR | 100 |  | NÃO | Nome parlamentar adotado na legislatura. |
| idLegislaturaInicial | INTEGER | — |  | SIM | Primeira legislatura do deputado. |
| idLegislaturaFinal | INTEGER | — |  | SIM | Última legislatura (ou atual). |
| nomeCivil | VARCHAR | 100 |  | SIM | Nome civil completo conforme documentos oficiais. |
| cpf | VARCHAR | 11 |  | SIM | CPF do deputado sem pontuação. |
| siglaSexo | CHAR | 1 |  | SIM | Sexo do parlamentar. |
| urlRedeSocial | VARCHAR | 500 |  | SIM | URLs de redes sociais (pode conter múltiplas). |
| urlWebsite | VARCHAR | 500 |  | SIM | Site pessoal do deputado. |
| dataNascimento | DATE | — |  | SIM | Data de nascimento. |
| dataFalecimento | DATE | — |  | SIM | Data de falecimento, se aplicável. |
| ufNascimento | CHAR | 2 |  | SIM | UF onde o deputado nasceu. |
| municipioNascimento | VARCHAR | 100 |  | SIM | Cidade de nascimento. |
| escolaridade | VARCHAR | 80 |  | SIM | Grau de escolaridade autodeclarado. |
| id | INTEGER | — | PK | NÃO | Identificador numérico único do deputado (calculado). |
| urlFoto | VARCHAR | 200 |  | SIM | Endereço da foto do deputado. |

---

### GASTO

| Campo | Tipo | Tamanho | Chave | Null? | Descrição |
|---|---|---|---|---|---|
| ideDocumento | INTEGER | — | PK | NÃO | Identificador interno do documento comprobatório. |
| idDeCadastro | INTEGER | — | FK → deputado.id | SIM | Identificador interno de cadastro. |
| nuDeputadoId | INTEGER | — |  | SIM | Identificador do deputado que realizou a despesa. |
| txNomeParlamentar | VARCHAR | 100 |  | NÃO | Nome do parlamentar ou órgão beneficiário. |
| cpf | VARCHAR | 11 |  | SIM | CPF do parlamentar beneficiário. |
| nuCarteiraParlamentar | INTEGER | — |  | SIM | Número da carteira parlamentar. |
| nuLegislatura | INTEGER | — |  | NÃO | Número da legislatura do gasto. |
| sgUF | CHAR | 2 |  | SIM | UF do deputado no momento da despesa. |
| sgPartido | VARCHAR | 20 |  | SIM | Partido do deputado no momento da despesa. |
| codLegislatura | INTEGER | — |  | NÃO | Código numérico da legislatura. |
| numSubCota | INTEGER | — |  | NÃO | Código da categoria de despesa. |
| txtDescricao | VARCHAR | 200 |  | NÃO | Descrição da categoria de despesa CEAP. |
| numEspecificacaoSubCota | INTEGER | — |  | SIM | Código de especificação adicional da subcota. |
| txtDescricaoEspecificacao | VARCHAR | 200 |  | SIM | Descrição da especificação da subcota. |
| txtFornecedor | VARCHAR | 200 |  | NÃO | Nome do fornecedor conforme nota fiscal. |
| txtCNPJCPF | VARCHAR | 18 |  | SIM | CNPJ ou CPF do fornecedor com pontuação. |
| txtNumero | VARCHAR | 50 |  | NÃO | Número do documento fiscal. |
| indTipoDocumento | INTEGER | — |  | SIM | Tipo de documento. |
| datEmissao | DATETIME | — |  | NÃO | Data de emissão do documento fiscal. |
| vlrDocumento | DECIMAL | 10,2 |  | NÃO | Valor de face do documento. |
| vlrGlosa | DECIMAL | 10,2 |  | NÃO | Valor retido não coberto pela CEAP. |
| vlrLiquido | DECIMAL | 10,2 |  | NÃO | Valor efetivamente debitado da cota parlamentar. |
| numMes | INTEGER | — |  | NÃO | Mês de competência financeira. |
| numAno | INTEGER | — |  | NÃO | Ano de competência financeira. |
| numParcela | INTEGER | — |  | NÃO | Número da parcela. |
| txtPassageiro | VARCHAR | 100 |  | SIM | Nome do passageiro em registros de viagem. |
| txtTrecho | VARCHAR | 200 |  | SIM | Trecho da viagem (padrão IATA). |
| numLote | INTEGER | — |  | SIM | Número do lote de processamento. |
| numRessarcimento | INTEGER | — |  | SIM | Número do ressarcimento no lote. |
| datPagamentoRestituicao | DATETIME | — |  | SIM | Data de pagamento de restituição à Câmara. |
| vlrRestituicao | DECIMAL | 10,2 |  | SIM | Valor devolvido à Câmara. |
| urlDocumento | VARCHAR | 500 |  | SIM | Link para o PDF da despesa. |

---

### EVENTO

| Campo | Tipo | Tamanho | Chave | Null? | Descrição |
|---|---|---|---|---|---|
| id | INTEGER | — | PK | NÃO | Identificador único do evento. |
| uri | VARCHAR | 200 |  | NÃO | URI do evento na API. |
| urlDocumentoPauta | VARCHAR | 500 |  | SIM | URL da pauta em PDF. |
| dataHoraInicio | DATETIME | — |  | SIM | Data e hora de início. |
| dataHoraFim | DATETIME | — |  | SIM | Data e hora de encerramento. |
| situacao | VARCHAR | 50 |  | NÃO | Status do evento. |
| descricao | TEXT | — |  | SIM | Descrição ou pauta do evento. |
| descricaoTipo | VARCHAR | 100 |  | NÃO | Tipo do evento. |
| localExterno | VARCHAR | 200 |  | SIM | Local externo ao complexo da Câmara. |
| localCamara.nome | VARCHAR | 200 |  | SIM | Nome do local dentro da Câmara. |
| localCamara.predio | VARCHAR | 50 |  | SIM | Prédio do local. |
| localCamara.sala | VARCHAR | 20 |  | SIM | Sala ou plenário. |
| localCamara.andar | VARCHAR | 20 |  | SIM | Andar do local. |

---

### VOTACAO

| Campo | Tipo | Tamanho | Chave | Null? | Descrição |
|---|---|---|---|---|---|
| id | VARCHAR | 20 | PK | NÃO | Identificador único da votação. |
| uri | VARCHAR | 200 |  | NÃO | URI da votação na API. |
| data | DATE | — |  | NÃO | Data da votação. |
| dataHoraRegistro | DATETIME | — |  | NÃO | Data e hora exata do registro. |
| idOrgao | INTEGER | — |  | NÃO | Código do órgão responsável. |
| uriOrgao | VARCHAR | 200 |  | NÃO | URI do órgão. |
| siglaOrgao | VARCHAR | 10 |  | NÃO | Sigla do órgão. |
| idEvento | INTEGER | — | FK → evento.id | NÃO | Evento/sessão que sediou a votação. |
| uriEvento | VARCHAR | 200 |  | NÃO | URI do evento associado. |
| aprovacao | INTEGER | — |  | SIM | Resultado da votação. |
| votosSim | INTEGER | — |  | SIM | Total de votos 'Sim'. |
| votosNao | INTEGER | — |  | SIM | Total de votos 'Não'. |
| votosOutros | INTEGER | — |  | SIM | Total de abstenções e outros. |
| descricao | TEXT | — |  | SIM | Descrição do objeto votado. |
| ultimaAberturaVotacao_dataHoraRegistro | DATETIME | — |  | SIM | Momento da última abertura. |
| ultimaAberturaVotacao_descricao | VARCHAR | 200 |  | SIM | Descrição da última abertura. |
| ultimaApresentacaoProposicao_dataHoraRegistro | DATETIME | — |  | SIM | Momento da apresentação da proposição. |
| ultimaApresentacaoProposicao_descricao | TEXT | — |  | SIM | Descrição da apresentação. |
| ultimaApresentacaoProposicao_idProposicao | INTEGER | — |  | SIM | ID da proposição votada. |
| ultimaApresentacaoProposicao_uriProposicao | VARCHAR | 200 |  | SIM | URI da proposição. |

---

### PROPOSICAO

| Campo | Tipo | Tamanho | Chave | Null? | Descrição |
|---|---|---|---|---|---|
| id | INTEGER | — | PK | NÃO | Identificador único da proposição. |
| uri | VARCHAR | 200 |  | NÃO | URI da proposição na API. |
| siglaTipo | VARCHAR | 10 |  | NÃO | Tipo da proposição. |
| numero | INTEGER | — |  | NÃO | Número sequencial no ano. |
| ano | INTEGER | — |  | NÃO | Ano de apresentação. |
| codTipo | INTEGER | — |  | NÃO | Código numérico do tipo. |
| descricaoTipo | VARCHAR | 100 |  | NÃO | Descrição textual do tipo. |
| ementa | TEXT | — |  | SIM | Ementa resumida da proposição. |
| ementaDetalhada | TEXT | — |  | SIM | Ementa detalhada. Pode conter HTML. |
| keywords | VARCHAR | 500 |  | SIM | Palavras-chave separadas por vírgula. |
| dataApresentacao | DATETIME | — |  | SIM | Data e hora de apresentação formal. |
| uriOrgaoNumerador | VARCHAR | 200 |  | SIM | URI do órgão numerador. |
| uriPropAnterior | VARCHAR | 200 |  | SIM | URI da proposição anterior. |
| uriPropPrincipal | VARCHAR | 200 |  | SIM | URI da proposição principal. |
| uriPropPosterior | VARCHAR | 200 |  | SIM | URI da proposição posterior. |
| urlInteiroTeor | VARCHAR | 500 |  | SIM | Link para o texto completo. |
| urnFinal | VARCHAR | 100 |  | SIM | URN final da proposição. |
| ultimoStatus_dataHora | DATETIME | — |  | SIM | Data/hora do último status. |
| ultimoStatus_sequencia | INTEGER | — |  | SIM | Sequência do status. |
| ultimoStatus_uriRelator | VARCHAR | 200 |  | SIM | URI do relator. |
| ultimoStatus_idOrgao | INTEGER | — |  | SIM | Código do órgão atual. |
| ultimoStatus_siglaOrgao | VARCHAR | 20 |  | SIM | Sigla do órgão. |
| ultimoStatus_uriOrgao | VARCHAR | 200 |  | SIM | URI do órgão. |
| ultimoStatus_regime | VARCHAR | 100 |  | SIM | Regime de tramitação. |
| ultimoStatus_descricaoTramitacao | TEXT | — |  | SIM | Descrição da tramitação. |
| ultimoStatus_idTipoTramitacao | INTEGER | — |  | SIM | Código do tipo de tramitação. |
| ultimoStatus_descricaoSituacao | VARCHAR | 100 |  | SIM | Situação atual. |
| ultimoStatus_idSituacao | INTEGER | — |  | SIM | Código da situação. |

---

### TEMA

| Campo | Tipo | Tamanho | Chave | Null? | Descrição |
|---|---|---|---|---|---|
| codTema | INTEGER | — | PK | NÃO | Código numérico do tema. |
| tema | VARCHAR | 100 |  | NÃO | Nome descritivo da área temática. |
| relevancia | INTEGER | — |  | SIM | Nível de relevância do tema. |

---

### BANCADA

| Campo | Tipo | Tamanho | Chave | Null? | Descrição |
|---|---|---|---|---|---|
| siglaBancada | VARCHAR | 20 | PK | NÃO | Sigla da bancada ou partido. |
| uriBancada | VARCHAR | 200 |  | SIM | URI da bancada na API. |

---

### PRESENCA

| Campo | Tipo | Tamanho | Chave | Null? | Descrição |
|---|---|---|---|---|---|
| idEvento | INTEGER | — | FK → evento.id | NÃO | Identificador do evento. |
| idDeputado | INTEGER | — | FK → deputado.id | NÃO | Identificador do deputado presente. |
| data | DATETIME | — |  | SIM | Data/hora do início do evento. |
| uriEvento | VARCHAR | 200 |  | SIM | URI do evento. |
| uriDeputado | VARCHAR | 200 |  | SIM | URI do deputado. |

---

### VOTO

| Campo | Tipo | Tamanho | Chave | Null? | Descrição |
|---|---|---|---|---|---|
| idVotacao | VARCHAR | 20 | FK → votacao.id | NÃO | Votação em que o voto foi registrado. |
| deputado_id | INTEGER | — | FK → deputado.id | NÃO | Deputado que emitiu o voto. |
| voto | VARCHAR | 10 |  | SIM | Voto registrado. |
| dataHoraVoto | DATETIME | — |  | SIM | Data e hora exata do registro. |
| deputado_uri | VARCHAR | — |  | SIM | URI do deputado. |
| deputado_nome | VARCHAR | — |  | SIM | Nome do deputado no momento do voto. |
| deputado_siglaPartido | VARCHAR | — |  | SIM | Partido no momento do voto. |
| deputado_siglaUf | CHAR | 2 |  | SIM | UF do deputado. |
| deputado_urlFoto | VARCHAR | — |  | SIM | URL da foto. |

---

### PAUTA

| Campo | Tipo | Tamanho | Chave | Null? | Descrição |
|---|---|---|---|---|---|
| idVotacao | VARCHAR | 20 | FK → votacao.id | NÃO | Votação que deliberou sobre a proposição. |
| proposicao_id | INTEGER | — | FK → proposicao.id | NÃO | Proposição que entrou em pauta. |
| data | DATE | — |  | SIM | Data da votação. |
| descricao | VARCHAR | 200 |  | SIM | Descrição do objeto votado. |
| proposicao_uri | VARCHAR | 200 |  | SIM | URI da proposição. |
| proposicao_titulo | VARCHAR | 100 |  | SIM | Título da proposição. |
| proposicao_ementa | TEXT | — |  | SIM | Ementa da proposição. |
| proposicao_codTipo | INTEGER | — |  | SIM | Código do tipo. |
| proposicao_siglaTipo | VARCHAR | 20 |  | SIM | Sigla do tipo. |
| proposicao_numero | INTEGER | — |  | SIM | Número da proposição. |
| proposicao_ano | INTEGER | — |  | SIM | Ano da proposição. |

---

### ORIENTACAO

| Campo | Tipo | Tamanho | Chave | Null? | Descrição |
|---|---|---|---|---|---|
| idVotacao | VARCHAR | 20 | FK → votacao.id | NÃO | Votação à qual a orientação se refere. |
| siglaBancada | VARCHAR | 20 | FK → bancada.siglaBancada | NÃO | Bancada que emitiu a orientação. |
| uriVotacao | VARCHAR | 200 |  | SIM | URI da votação. |
| siglaOrgao | VARCHAR | 20 |  | SIM | Órgão onde ocorreu. |
| descricao | TEXT | 200 |  | SIM | Descrição da orientação emitida. |
| uriBancada | VARCHAR | 200 |  | SIM | URI da bancada. |
| orientacao | VARCHAR | 10 |  | SIM | Voto orientado pela liderança. |

---

### AUTORIA

| Campo | Tipo | Tamanho | Chave | Null? | Descrição |
|---|---|---|---|---|---|
| idProposicao | INTEGER | — | FK → proposicao.id | NÃO | Proposição à qual a autoria pertence. |
| idDeputadoAutor | INTEGER | — | FK → deputado.id | SIM | Deputado que assinou a proposição. |
| uriProposicao | VARCHAR | 200 |  | SIM | URI da proposição. |
| uriAutor | VARCHAR | 200 |  | SIM | URI do autor. |
| codTipoAutor | INTEGER | — |  | SIM | Código do tipo de autor. |
| tipoAutor | VARCHAR | 100 |  | SIM | Descrição do tipo de autor. |
| nomeAutor | VARCHAR | 100 |  | SIM | Nome do autor conforme registrado. |
| siglaPartidoAutor | VARCHAR | 20 |  | SIM | Partido do autor na assinatura. |
| uriPartidoAutor | VARCHAR | 200 |  | SIM | URI do partido do autor. |
| siglaUFAutor | CHAR | 2 |  | SIM | UF do autor. |
| ordemAssinatura | INTEGER | — |  | SIM | Ordem de assinatura. |
| proponente | INTEGER | — |  | SIM | Indicador de proponente. |

---

### CLASSIFICACAO

| Campo | Tipo | Tamanho | Chave | Null? | Descrição |
|---|---|---|---|---|---|
| idProposicao | INTEGER | — | FK → proposicao.id | NÃO | Proposição classificada no tema. |
| codTema | INTEGER | — | FK → tema.codTema | NÃO | Código do tema associado. |
| uriProposicao | VARCHAR | — |  | SIM | URI da proposição. |
| siglaTipo | VARCHAR | 20 |  | SIM | Tipo da proposição. |
| numero | INTEGER | — |  | SIM | Número da proposição. |
| ano | INTEGER | — |  | SIM | Ano da proposição. |
| relevancia | INTEGER | — |  | SIM | Relevância do tema para esta proposição. |

---

## Perguntas

1. Deputados ordenados por gastos totais.
2. Agrupar deputados por eixo de atuação (Nuvem de Palavras) — ex.: social, econômico, tributário, segurança, saúde; com drill-down de tema para ver os deputados mais ativos.
3. Como um deputado votou em um tema/eixo específico.
4. Agrupar deputados por escolaridade.
5. Ordenar fornecedores (recebedores de despesas) por valor total recebido.
6. Correlacionar escolaridade com:
   a. Volume de gastos;
   b. Fidelidade partidária;
   c. Nº de proposições apresentadas;
   d. Presença em eventos/comissões;
   e. Presença no plenário.
8. Ranking de influência baseado no percentual de propostas aprovadas pelo deputado em relação às que ele apresentou no plenário, ponderado pelo papel de autoria e pela margem de aprovação.

> **Visão Geral do Deputado:** além das 7 perguntas originais, o dashboard inclui uma tela agregadora que consolida todas as análises por deputado individual — gastos, eixos de atuação, padrão de votação, influência e escolaridade em um único painel.

---

## Endpoints da API

Toda a lógica analítica está implementada como endpoints FastAPI em `back-end/routers/`. A API sobe na porta **8000**; o Vite faz proxy automático de `/q1` … `/q8` para ela. Documentação interativa completa em **http://localhost:8000/docs**.

### Erros HTTP

| Código | Quando ocorre |
|---|---|
| `200 OK` | Sucesso. |
| `404 Not Found` | Rota inexistente, ou `/q3/votos` sem resultado para o deputado/tema informado. |
| `422 Unprocessable Entity` | Parâmetro inválido (tipo errado ou `limit` fora do intervalo permitido) — validado pelo FastAPI/Pydantic. |
| `500 Internal Server Error` | Erro não tratado. O handler global (`main.py`) retorna JSON `{"detail": "Erro interno do servidor.", "path": "..."}` e registra o traceback no log do servidor. |

### Health e warm-up

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Health check leve. Retorna `{"status":"ok","db":"<caminho>"}` (200) ou `{"status":"error","detail":"..."}` (503) se o banco não foi encontrado. |

No startup a API pré-computa em background as respostas das telas iniciais (`WARMUP` definido em cada router), armazenando-as no cache em memória. As chamadas subsequentes do front-end são servidas diretamente do cache, sem consultar o banco.

---

### Paginação e cache

- A API usa apenas `limit` (sem `offset`/cursor) — os endpoints retornam os *top N* de cada ranking, suficiente para o dashboard.
- Resultados de queries pesadas (Q2 ranking/palavras, Q6) são cacheados em memória no servidor (`back-end/cache.py`, TTL 1h); o front também cacheia respostas por 5 min (`front-end/src/lib/api.js`).
- CORS é restrito a `http://localhost:5173` por padrão; outras origens via env var `CORS_ORIGINS` (lista separada por vírgula).

---

### Q1 — `/q1` — Gastos dos Deputados

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/q1/gastos-deputados?limit=&partido=&ano=` | Lista deputados ordenados por `total_gasto` decrescente. `limit`, `partido` e `ano` opcionais. Com filtros, agrega direto de `gasto`; sem filtros usa `vw_gasto_deputado`. |
| `GET` | `/q1/gastos-detalhados/{deputado_id}` | Gastos do deputado agrupados por categoria CEAP (`txtDescricao`) — ordena pelo total da categoria. Identifica a **categoria de maior gasto** do deputado. |
| `GET` | `/q1/deputados` | Lista leve (id, nome, foto) para autocomplete de busca. |
| `GET` | `/q1/filtros` | Listas de `partidos` e `anos` disponíveis para popular os dropdowns do Q1. |
| `GET` | `/q1/gastos-por-partido?ano=` | Gasto total por partido entre todos os deputados. `ano` opcional. |
| `GET` | `/q1/gastos-categoria-partido?partido=&ano=` | Gasto de um partido dividido por categoria de despesa. `partido` obrigatório; `ano` opcional. |

**Método de cálculo:**
- Usa `vw_gasto_deputado`: `SUM(vlrLiquido)` como total gasto e `COUNT(ideDocumento)` como nº de transações por deputado (sem filtros de partido/ano).
- Quando `partido` ou `ano` são informados, agrega diretamente de `gasto` com `WHERE` parametrizado; partido e UF são extraídos via `ROW_NUMBER() OVER (PARTITION BY id ORDER BY numAno DESC, numMes DESC, ideDocumento DESC)` dentro do subconjunto filtrado.
- `gastos-detalhados` agrupa diretamente em `gasto` por `txtDescricao` (apenas `vlrLiquido > 0`), retornando total, média, ticket máximo e maior fornecedor de cada categoria.
- `gastos-por-partido` e `gastos-categoria-partido` agregam `gasto` por `sgPartido` / `txtDescricao`, com `COUNT(DISTINCT idDeCadastro)` para nº de deputados distintos.

---

### Q2 — `/q2` — Eixo de Atuação

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/q2/ranking-temas` | Ranking de temas por nº de proposições distintas. Inclui `codTema` para identificação. |
| `GET` | `/q2/tema-por-deputado?limit=` | Tema dominante de cada deputado (o com mais proposições de autoria). |
| `GET` | `/q2/deputados-por-tema?cod_tema=&limit=` | **Drill-down:** top deputados por nº de proposições no tema `cod_tema`. Alimenta o modal que abre ao clicar numa bolha ou palavra na nuvem. |
| `GET` | `/q2/palavras-ementas?limit=` | Top N palavras mais frequentes no **texto das ementas** das proposições (padrão 120, máx. 500). Alimenta a nuvem de palavras clássica. |

**Método de cálculo:**
- `ranking-temas`: `COUNT(DISTINCT a.idProposicao)` agrupado por `tema`, juntando `tema → classificacao → autoria`.
- `tema-por-deputado`: CTE com `ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY COUNT(*) DESC)` — seleciona o tema com mais proposições de autoria de cada deputado.
- `deputados-por-tema`: `COUNT(DISTINCT a.idProposicao)` por deputado filtrando `c.codTema = :cod_tema`; `LEFT JOIN vw_gasto_deputado` para partido/UF.
- `palavras-ementas`: pipeline de análise textual em Python (`routers/q2_eixo_atuacao.py`): lê todas as `proposicao.ementa` não nulas → minúsculas → tokeniza por regex (sequências de letras com acentos, 3+ caracteres, descartando números e pontuação) → remove ~250 stopwords PT-BR + jargão legislativo (`stopwords_pt.py`: "dispõe", "providências", "altera"…) → conta frequências com `collections.Counter`. O resultado completo (top 500) fica **cacheado em memória** (`cache.py`) — a primeira chamada percorre todo o corpus e pode levar alguns segundos; as seguintes são imediatas.

**As duas nuvens do dashboard:**
- *Nuvem de temas* (`ranking-temas`): nuvem de **tags** — rótulos temáticos oficiais da Câmara, com tamanho ∝ nº de proposições.
- *Nuvem de palavras das ementas* (`palavras-ementas`): nuvem de palavras **clássica** — palavras extraídas do texto, com tamanho ∝ frequência no corpus.
- Em ambas o front aplica escala **raiz quadrada** ao tamanho da fonte (o olho percebe área ≈ fonte², não altura), cores determinísticas por palavra e tooltip com o valor exato.

---

### Q3 — `/q3` — Votação por Tema

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/q3/temas` | Todos os temas disponíveis no banco. |
| `GET` | `/q3/deputados` | Deputados que possuem registros de voto. |
| `GET` | `/q3/votos?deputado_id=&tema=` | Como o deputado votou em proposições do tema (busca parcial por nome). |

**Método de cálculo:**
- Junta `voto → pauta → classificacao → tema` para recuperar cada voto registrado do deputado em proposições do tema informado.
- Percentual por tipo de voto via window function: `100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY d.id, t.codTema)`.
- `tema` aceita busca parcial (`LIKE %tema%`); retorna 404 se não há resultado.

---

### Q4 — `/q4` — Distribuição por Escolaridade

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/q4/escolaridade` | Distribuição de deputados por faixa de escolaridade. |

**Método de cálculo:**
- Usa `vw_escolaridade_norm` + `vw_deputado_atual`.
- `COUNT(*)` por bucket ordinal + percentual via `SUM(COUNT(*)) OVER ()`.
- Ordenado por `escolaridade_ord` (0 → 4) para eixo lógico nos gráficos.

---

### Q5 — `/q5` — Fornecedores por Valor Recebido

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/q5/fornecedores?limit=` | Ranking de fornecedores por valor total recebido (padrão top 50). |

**Método de cálculo:**
- Agrupa `gasto` por `txtFornecedor` e `txtCNPJCPF` (apenas `vlrLiquido > 0`).
- Retorna `SUM(vlrLiquido)` (total recebido), `AVG(vlrLiquido)` (ticket médio), `COUNT(*)` (transações) e `COUNT(DISTINCT idDeCadastro)` (nº de deputados atendidos).

---

### Q6 — `/q6` — Correlação Escolaridade

#### Endpoints de média por faixa (barras no dashboard)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/q6/gastos` | Gastos médios por faixa de escolaridade. |
| `GET` | `/q6/fidelidade-partidaria` | % médio de fidelidade partidária por faixa. |
| `GET` | `/q6/proposicoes` | Nº médio de proposições por faixa. |
| `GET` | `/q6/presenca-eventos` | Nº médio de presenças em eventos/comissões por faixa. |
| `GET` | `/q6/presenca-plenario` | Nº médio de presenças em Sessões Deliberativas por faixa. |

#### Endpoint de dados individuais (scatter no dashboard)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/q6/dados-deputado` | **Uma linha por deputado** com `escolaridade_ord` + as 4 métricas individuais. Alimenta os gráficos de dispersão e o cálculo dos coeficientes de correlação. |

**Método de cálculo por sub-questão:**

| Sub | Título | Método |
|---|---|---|
| **6a** | Gastos | `SUM(vlrLiquido)` e `AVG(vlrLiquido)` agrupados por escolaridade; média por deputado = total / `COUNT(DISTINCT d.id)` |
| **6b** | Fidelidade Partidária | Junta `voto → orientacao` pelo partido do deputado; `% fidelidade = votos em que voto = orientação / total de votos com orientação` (excluindo orientação `'Liberado'`) |
| **6c** | Nº de Proposições | `COUNT(autoria)` por escolaridade; média = total / `COUNT(DISTINCT d.id)` via LEFT JOIN para incluir deputados sem proposições |
| **6d** | Presença em Eventos | `COUNT(presenca)` por escolaridade; média = total / `COUNT(DISTINCT d.id)` via LEFT JOIN |
| **6e** | Presença no Plenário | Igual ao 6d, porém filtrando apenas eventos com `descricaoTipo = 'Sessão Deliberativa'` via subquery |

**Cálculo dos coeficientes de correlação (front-end):**

Os coeficientes são calculados no navegador por `src/lib/stats.js` a partir dos dados de `/q6/dados-deputado`:

- **r de Pearson** — mede a correlação linear entre `escolaridade_ord` e a métrica.
- **ρ de Spearman** — mede a correlação monotônica usando postos. **Mais adequado** aqui porque escolaridade é uma variável ordinal (as distâncias entre níveis não são uniformes); Spearman não assume isso.
- **Reta de regressão** (`slope`, `intercept`) — calculada pelos mínimos quadrados ordinários e sobreposta ao scatter.
- **Interpretação textual** automática da força (≥ 0,70 forte · 0,40–0,69 moderada · 0,20–0,39 fraca · < 0,20 muito fraca) e direção do coeficiente.

**Por que o `num_deputados` varia entre as sub-questões?**

Todas as queries usam `COUNT(DISTINCT d.id)` — o mecanismo é idêntico: conta IDs únicos de deputados nas linhas que chegam ao agrupamento. O que muda é **quais linhas chegam até esse COUNT**, e isso depende do tipo de JOIN usado.

O JOIN transforma a tabela de deputados antes do agrupamento. Com `INNER JOIN`, só existem linhas onde há correspondência nas duas tabelas — deputados sem registros na tabela relacionada desaparecem silenciosamente. Com `LEFT JOIN`, cada deputado aparece pelo menos uma vez, com `NULL` nas colunas da tabela direita quando não há correspondência.

Exemplo com 6a (Gastos, `INNER JOIN`): o banco de dados gera uma linha por transação de cada deputado. O `COUNT(DISTINCT d.id)` conta IDs únicos nesse conjunto. Um deputado sem nenhum lançamento em `gasto` nunca aparece nessa tabela intermediária e não é contado.

Exemplo com 6c (Proposições, `LEFT JOIN`): todos os deputados com `escolaridade IS NOT NULL` aparecem, mesmo sem proposições. O deputado sem autoria entra com `NULL` em `a.idProposicao` — o `COUNT(DISTINCT d.id)` ainda o conta (porque `d.id` não é NULL), enquanto `COUNT(a.idProposicao)` retorna 0 para ele, pois `COUNT` ignora NULLs.

| Sub | JOIN | Quem é excluído da contagem |
|-----|------|-----------------------------|
| **6a** Gastos | `INNER JOIN gasto` | Deputados sem nenhum gasto registrado |
| **6b** Fidelidade | `INNER JOIN voto` + `INNER JOIN orientacao` | Deputados sem votos em sessões com orientação partidária não-liberada |
| **6c** Proposições | `LEFT JOIN autoria` | Ninguém — universo completo |
| **6d** Presença eventos | `LEFT JOIN presenca` | Ninguém — universo completo |
| **6e** Presença plenário | `LEFT JOIN (presenca + evento)` | Ninguém — universo completo |

As sub-questões 6c, 6d e 6e devem retornar o mesmo `num_deputados` por escolaridade, pois todas partem do universo completo via `LEFT JOIN`. As sub-questões 6a e 6b tendem a apresentar contagens menores, uma vez que o `INNER JOIN` exclui deputados sem dados nas tabelas relacionadas.

---

### Q7 — `/q7` — Ranking de Influência ( Questão 8)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/q7/influencia?limit=` | Deputados ordenados por `pct_influencia` decrescente (padrão top 50, máx. 513). |
| `GET` | `/q7/proposicoes-influencia/{deputado_id}` | Proposições aprovadas no plenário que compõem o score do deputado, com `peso`, `margem` e `contribuicao` por proposição. Alimenta o `ProposicoesInfluenciaModal`. Cacheado 1h. |

**Método de cálculo — `vw_influencia` (`back-end/views.py`):**

Para cada proposição aprovada no Plenário (`siglaOrgao = 'PLEN'`, `aprovacao = 1`), calcula-se a contribuição do deputado como:

```
contribuição = peso_autoria × margem_aprovação
```

onde:

- **`peso_autoria`**: `1.0` se o deputado é autor principal (`ordemAssinatura ≤ 1` ou `proponente = 1`); senão `1.0 / ordemAssinatura` (2ª assinatura → 0,50; 3ª → 0,33; N-ésima → 1/N).
- **`margem_aprovação`**: `votosSim / (votosSim + votosNão)`. Votações sem placar registrado recebem fallback `0.5`.

O `score_ponderado` de cada deputado é a soma dessas contribuições sobre todas as suas proposições aprovadas.

O índice final combina score normalizado **(70%)** com taxa de conversão **(30%)**:

```
pct_influencia = 100 × (0,7 × score / MAX(score) + 0,3 × aprovadas / em_pauta)
```

CTEs utilizadas: `plen_aprovadas`, `dep_pauta`, `dep_score`, `dep_partido`. Apenas deputados com ≥ 1 proposição aprovada entram no ranking.

---

### Q8 — `/q8` — Visão Geral do Deputado ( Não é relacionado à nenhuma questão em específico)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/q8/deputados` | Lista leve (id, nome, foto) de todos os deputados da legislatura para o autocomplete de busca. |
| `GET` | `/q8/visao-geral/{deputado_id}` | Objeto agregador único com todos os dados do deputado (ver abaixo). Retorna 404 se o deputado não existe na legislatura 2023–2026. Cacheado 1h. |

**Objeto retornado por `/q8/visao-geral/{deputado_id}`:**

| Campo | Origem | Descrição |
|---|---|---|
| `id`, `nome`, `urlFoto`, `partido`, `uf` | `vw_gasto_deputado` + `deputado` | Cabeçalho do deputado. |
| `total_gasto`, `num_transacoes` | `vw_gasto_deputado` | Totais CEAP da legislatura. |
| `escolaridade`, `escolaridade_ord` | `vw_escolaridade_norm` | Faixa de escolaridade normalizada (0–4). |
| `gastos_categoria` | `gasto` | Top 10 categorias de despesa com total, média, ticket máximo e maior fornecedor. |
| `fornecedores` | `gasto` | Top 10 fornecedores com total recebido e nº de transações. |
| `temas_nuvem` | `tema` + `classificacao` + `autoria` | Temas legislativos de autoria, com nº de proposições (alimenta nuvem). |
| `palavras_ementas` | `proposicao` + `autoria` | Top 80 palavras das ementas de proposições de autoria (tokenização + stopwords PT-BR). |
| `votos_por_tema` | `voto` + `pauta` + `classificacao` + `tema` | Contagem de votos por tipo (`Sim`/`Não`/etc.) agrupados por tema. |
| `influencia` | `vw_influencia` | `score_ponderado`, `pct_influencia`, `em_pauta_plen`, `aprovadas_pelo_dep`, `taxa_aprovacao` (ou `null` se o deputado não aparece no ranking). |

**Nota:** Q8 é um endpoint agregador de visualização que reaproveita a lógica analítica de Q1, Q2, Q3, Q5 e Q7 — mas consolidada por deputado individual, sem ser uma pergunta analítica independente.
