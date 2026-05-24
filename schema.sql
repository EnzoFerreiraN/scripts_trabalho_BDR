-- schema.sql
-- Banco de dados SQLite — Câmara dos Deputados
-- Grupo 7 — BDR

-- ============================================================
-- Tabelas Entidade
-- ============================================================

CREATE TABLE IF NOT EXISTS deputado (
    id                    INTEGER PRIMARY KEY,
    uri                   TEXT    NOT NULL,
    nome                  TEXT    NOT NULL,
    idLegislaturaInicial  INTEGER,
    idLegislaturaFinal    INTEGER,
    nomeCivil             TEXT,
    cpf                   TEXT,
    siglaSexo             TEXT,
    urlRedeSocial         TEXT,
    urlWebsite            TEXT,
    dataNascimento        TEXT,
    dataFalecimento       TEXT,
    ufNascimento          TEXT,
    municipioNascimento   TEXT,
    escolaridade          TEXT,
    urlFoto               TEXT
);

CREATE TABLE IF NOT EXISTS evento (
    id                  INTEGER PRIMARY KEY,
    uri                 TEXT    NOT NULL,
    urlDocumentoPauta   TEXT,
    dataHoraInicio      TEXT,
    dataHoraFim         TEXT,
    situacao            TEXT,
    descricao           TEXT,
    descricaoTipo       TEXT,
    localExterno        TEXT,
    localCamara_nome    TEXT,
    localCamara_predio  TEXT,
    localCamara_sala    TEXT,
    localCamara_andar   TEXT
);

CREATE TABLE IF NOT EXISTS proposicao (
    id                                        INTEGER PRIMARY KEY,
    uri                                       TEXT    NOT NULL,
    siglaTipo                                 TEXT    NOT NULL,
    numero                                    INTEGER NOT NULL,
    ano                                       INTEGER NOT NULL,
    codTipo                                   INTEGER NOT NULL,
    descricaoTipo                             TEXT    NOT NULL,
    ementa                                    TEXT,
    ementaDetalhada                           TEXT,
    keywords                                  TEXT,
    dataApresentacao                          TEXT,
    uriOrgaoNumerador                         TEXT,
    uriPropAnterior                           TEXT,
    uriPropPrincipal                          TEXT,
    uriPropPosterior                          TEXT,
    urlInteiroTeor                            TEXT,
    urnFinal                                  TEXT,
    ultimoStatus_dataHora                     TEXT,
    ultimoStatus_sequencia                    INTEGER,
    ultimoStatus_uriRelator                   TEXT,
    ultimoStatus_idOrgao                      INTEGER,
    ultimoStatus_siglaOrgao                   TEXT,
    ultimoStatus_uriOrgao                     TEXT,
    ultimoStatus_regime                       TEXT,
    ultimoStatus_descricaoTramitacao          TEXT,
    ultimoStatus_idTipoTramitacao             INTEGER,
    ultimoStatus_descricaoSituacao            TEXT,
    ultimoStatus_idSituacao                   INTEGER
);

CREATE TABLE IF NOT EXISTS tema (
    codTema     INTEGER PRIMARY KEY,
    tema        TEXT    NOT NULL,
    relevancia  INTEGER
);

CREATE TABLE IF NOT EXISTS bancada (
    siglaBancada    TEXT PRIMARY KEY,
    uriBancada      TEXT
);

CREATE TABLE IF NOT EXISTS votacao (
    id                                            TEXT    PRIMARY KEY,
    uri                                           TEXT    NOT NULL,
    data                                          TEXT    NOT NULL,
    dataHoraRegistro                              TEXT    NOT NULL,
    idOrgao                                       INTEGER NOT NULL,
    uriOrgao                                      TEXT    NOT NULL,
    siglaOrgao                                    TEXT    NOT NULL,
    idEvento                                      INTEGER REFERENCES evento(id),
    uriEvento                                     TEXT,
    aprovacao                                     INTEGER,
    votosSim                                      INTEGER,
    votosNao                                      INTEGER,
    votosOutros                                   INTEGER,
    descricao                                     TEXT,
    ultimaAberturaVotacao_dataHoraRegistro        TEXT,
    ultimaAberturaVotacao_descricao               TEXT,
    ultimaApresentacaoProposicao_dataHoraRegistro TEXT,
    ultimaApresentacaoProposicao_descricao        TEXT,
    ultimaApresentacaoProposicao_idProposicao     INTEGER,
    ultimaApresentacaoProposicao_uriProposicao    TEXT
);

CREATE TABLE IF NOT EXISTS gasto (
    ideDocumento              INTEGER PRIMARY KEY,
    nuDeputadoId              INTEGER REFERENCES deputado(id),
    txNomeParlamentar         TEXT    NOT NULL,
    cpf                       TEXT,
    ideCadastro               INTEGER,
    nuCarteiraParlamentar     INTEGER,
    nuLegislatura             INTEGER NOT NULL,
    sgUF                      TEXT,
    sgPartido                 TEXT,
    codLegislatura            INTEGER NOT NULL,
    numSubCota                INTEGER NOT NULL,
    txtDescricao              TEXT    NOT NULL,
    numEspecificacaoSubCota   INTEGER,
    txtDescricaoEspecificacao TEXT,
    txtFornecedor             TEXT    NOT NULL,
    txtCNPJCPF                TEXT,
    txtNumero                 TEXT    NOT NULL,
    indTipoDocumento          INTEGER,
    datEmissao                TEXT    NOT NULL,
    vlrDocumento              REAL    NOT NULL,
    vlrGlosa                  REAL    NOT NULL,
    vlrLiquido                REAL    NOT NULL,
    numMes                    INTEGER NOT NULL,
    numAno                    INTEGER NOT NULL,
    numParcela                INTEGER NOT NULL,
    txtPassageiro             TEXT,
    txtTrecho                 TEXT,
    numLote                   INTEGER,
    numRessarcimento          INTEGER,
    datPagamentoRestituicao   TEXT,
    vlrRestituicao            REAL,
    urlDocumento              TEXT
);

-- ============================================================
-- Tabelas Associativas
-- ============================================================

CREATE TABLE IF NOT EXISTS presenca (
    idEvento    INTEGER NOT NULL REFERENCES evento(id),
    idDeputado  INTEGER NOT NULL REFERENCES deputado(id),
    data        TEXT,
    uriEvento   TEXT,
    uriDeputado TEXT,
    PRIMARY KEY (idEvento, idDeputado)
);

CREATE TABLE IF NOT EXISTS voto (
    idVotacao             TEXT    NOT NULL REFERENCES votacao(id),
    deputado_id           INTEGER NOT NULL REFERENCES deputado(id),
    voto                  TEXT,
    dataHoraVoto          TEXT,
    deputado_uri          TEXT,
    deputado_nome         TEXT,
    deputado_siglaPartido TEXT,
    deputado_siglaUf      TEXT,
    deputado_urlFoto      TEXT,
    PRIMARY KEY (idVotacao, deputado_id)
);

CREATE TABLE IF NOT EXISTS pauta (
    idVotacao            TEXT    NOT NULL REFERENCES votacao(id),
    proposicao_id        INTEGER NOT NULL REFERENCES proposicao(id),
    data                 TEXT,
    descricao            TEXT,
    proposicao_uri       TEXT,
    proposicao_titulo    TEXT,
    proposicao_ementa    TEXT,
    proposicao_codTipo   INTEGER,
    proposicao_siglaTipo TEXT,
    proposicao_numero    INTEGER,
    proposicao_ano       INTEGER,
    PRIMARY KEY (idVotacao, proposicao_id)
);

CREATE TABLE IF NOT EXISTS orientacao (
    idVotacao    TEXT NOT NULL REFERENCES votacao(id),
    siglaBancada TEXT NOT NULL REFERENCES bancada(siglaBancada),
    uriVotacao   TEXT,
    siglaOrgao   TEXT,
    descricao    TEXT,
    uriBancada   TEXT,
    orientacao   TEXT,
    PRIMARY KEY (idVotacao, siglaBancada)
);

CREATE TABLE IF NOT EXISTS autoria (
    idProposicao      INTEGER NOT NULL REFERENCES proposicao(id),
    idDeputadoAutor   INTEGER REFERENCES deputado(id),
    uriProposicao     TEXT,
    uriAutor          TEXT,
    codTipoAutor      INTEGER,
    tipoAutor         TEXT,
    nomeAutor         TEXT,
    siglaPartidoAutor TEXT,
    uriPartidoAutor   TEXT,
    siglaUFAutor      TEXT,
    ordemAssinatura   INTEGER,
    proponente        INTEGER,
    PRIMARY KEY (idProposicao, nomeAutor, ordemAssinatura)
);

CREATE TABLE IF NOT EXISTS classificacao (
    idProposicao  INTEGER NOT NULL REFERENCES proposicao(id),
    codTema       INTEGER NOT NULL REFERENCES tema(codTema),
    uriProposicao TEXT,
    siglaTipo     TEXT,
    numero        INTEGER,
    ano           INTEGER,
    relevancia    INTEGER,
    PRIMARY KEY (idProposicao, codTema)
);

-- ============================================================
-- Índices para colunas FK (melhora performance dos JOINs)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_gasto_deputado    ON gasto(nuDeputadoId);
CREATE INDEX IF NOT EXISTS idx_votacao_evento    ON votacao(idEvento);
CREATE INDEX IF NOT EXISTS idx_voto_votacao      ON voto(idVotacao);
CREATE INDEX IF NOT EXISTS idx_voto_deputado     ON voto(deputado_id);
CREATE INDEX IF NOT EXISTS idx_presenca_evento   ON presenca(idEvento);
CREATE INDEX IF NOT EXISTS idx_presenca_deputado ON presenca(idDeputado);
CREATE INDEX IF NOT EXISTS idx_autoria_prop      ON autoria(idProposicao);
CREATE INDEX IF NOT EXISTS idx_autoria_dep       ON autoria(idDeputadoAutor);
CREATE INDEX IF NOT EXISTS idx_classif_prop      ON classificacao(idProposicao);
CREATE INDEX IF NOT EXISTS idx_classif_tema      ON classificacao(codTema);
CREATE INDEX IF NOT EXISTS idx_pauta_votacao     ON pauta(idVotacao);
CREATE INDEX IF NOT EXISTS idx_pauta_prop        ON pauta(proposicao_id);
CREATE INDEX IF NOT EXISTS idx_orientacao_vot    ON orientacao(idVotacao);
