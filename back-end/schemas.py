from pydantic import BaseModel
from typing import Optional


# Q1 - Gastos
class GastoDeputado(BaseModel):
    nome: str
    id: int
    partido: str
    uf: str
    num_transacoes: int
    total_gasto: float
    urlFoto: Optional[str] = None


# Q2 - Eixo de Atuação
class RankingTema(BaseModel):
    codTema: int
    tema: str
    num_proposicoes: int
    num_deputados: int


class TemaDeputado(BaseModel):
    id: int
    nome: str
    tema: str
    num_proposicoes: int


class PalavraEmenta(BaseModel):
    palavra: str
    frequencia: int


class DeputadoPorTema(BaseModel):
    id: int
    nome: str
    urlFoto: Optional[str] = None
    partido: Optional[str] = None
    uf: Optional[str] = None
    num_proposicoes: int


# Q3 - Votação por Tema
class Tema(BaseModel):
    codTema: int
    tema: str


class VotoPorTema(BaseModel):
    nome: str
    id: int
    tema: str
    voto: str
    num_votos: int
    pct: float
    urlFoto: Optional[str] = None


# Q4 - Escolaridade
class EscolaridadeDistribuicao(BaseModel):
    escolaridade: str
    num_deputados: int
    pct: float


# Q5 - Fornecedores
class Fornecedor(BaseModel):
    fornecedor: str
    cnpj_cpf: str
    categoria: str
    num_transacoes: int
    num_deputados: int
    total_recebido: float
    ticket_medio: float


# Q6 - Dados por deputado para correlação individual
class DadosDeputadoCorrelacao(BaseModel):
    dep_id: int
    escolaridade: str
    escolaridade_ord: int
    total_gasto: float
    pct_fidelidade: Optional[float] = None
    num_proposicoes: int
    num_presencas: int


# Q6 - Correlação Escolaridade
class CorrelacaoGastos(BaseModel):
    escolaridade: str
    num_deputados: int
    total_gasto: float
    media_gasto_por_deputado: float
    media_por_transacao: float


class CorrelacaoFidelidade(BaseModel):
    escolaridade: str
    num_deputados: int
    votos_com_orientacao: int
    votos_fieis: int
    pct_fidelidade: float


class CorrelacaoProposicoes(BaseModel):
    escolaridade: str
    num_deputados: int
    total_proposicoes: int
    media_por_deputado: float


class CorrelacaoPresenca(BaseModel):
    escolaridade: str
    num_deputados: int
    total_presencas: int
    media_por_deputado: float


class CorrelacaoPresencaPlenario(BaseModel):
    escolaridade: str
    num_deputados: int
    total_presencas_plenario: int
    media_por_deputado: float


# Q1 - Detalhe de gastos por deputado
class GastoDetalhe(BaseModel):
    categoria: str
    num_transacoes: int
    total: float
    media: float
    maior_fornecedor: Optional[str] = None
    maior_valor: float


# Q3 - Deputado básico para busca
class DeputadoBasico(BaseModel):
    id: int
    nome: str
    urlFoto: Optional[str] = None


# Q7 - Influência
class Influencia(BaseModel):
    nome: str
    partido: str
    uf: str
    em_pauta_plen: int
    aprovadas_pelo_dep: int
    taxa_aprovacao: Optional[float]
    total_aprovadas: int
    score_ponderado: float = 0.0   # peso por papel (autoria) × margem de aprovação
    pct_influencia: float
    urlFoto: Optional[str] = None
