"""Stopwords PT-BR para a nuvem de palavras das ementas (Q2).

Duas categorias:
  1. Stopwords gramaticais clássicas do português (artigos, preposições,
     pronomes, conjunções, advérbios comuns).
  2. Jargão legislativo "vazio" que aparece em quase toda ementa e não carrega
     significado temático ("dispõe", "providências", "altera", "lei" etc.).

Mantida como frozenset para lookup O(1) durante a tokenização.
"""

STOPWORDS = frozenset({
    # --- artigos / preposições / contrações ---
    "a", "o", "as", "os", "um", "uma", "uns", "umas",
    "de", "da", "do", "das", "dos", "em", "na", "no", "nas", "nos",
    "por", "pela", "pelo", "pelas", "pelos", "per",
    "para", "pra", "com", "sem", "sob", "sobre", "entre", "ante",
    "até", "após", "desde", "contra", "perante", "durante", "mediante",
    "ao", "aos", "à", "às", "num", "numa", "nuns", "numas",
    "dum", "duma", "deste", "desta", "destes", "destas",
    "desse", "dessa", "desses", "dessas", "disso", "disto",
    "neste", "nesta", "nestes", "nestas", "nesse", "nessa", "nesses", "nessas",
    "nisso", "nisto", "naquele", "naquela", "daquele", "daquela",
    # --- pronomes ---
    "eu", "tu", "ele", "ela", "nós", "vós", "eles", "elas",
    "me", "te", "se", "lhe", "lhes", "nos", "vos",
    "meu", "minha", "meus", "minhas", "teu", "tua", "teus", "tuas",
    "seu", "sua", "seus", "suas", "nosso", "nossa", "nossos", "nossas",
    "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas",
    "aquele", "aquela", "aqueles", "aquelas", "isto", "isso", "aquilo",
    "que", "quem", "qual", "quais", "cujo", "cuja", "cujos", "cujas",
    "onde", "quando", "quanto", "quanta", "quantos", "quantas",
    "algum", "alguma", "alguns", "algumas", "nenhum", "nenhuma",
    "todo", "toda", "todos", "todas", "outro", "outra", "outros", "outras",
    "mesmo", "mesma", "mesmos", "mesmas", "tal", "tais", "cada", "qualquer",
    # --- conjunções / advérbios / verbos auxiliares comuns ---
    "e", "ou", "mas", "nem", "pois", "porque", "porquanto", "portanto",
    "como", "assim", "também", "ainda", "já", "só", "apenas", "mais",
    "menos", "muito", "muita", "muitos", "muitas", "pouco", "pouca",
    "ser", "são", "foi", "foram", "será", "serão", "sendo", "sido",
    "é", "está", "estão", "estava", "estavam", "estar",
    "ter", "tem", "têm", "tinha", "tinham", "terá", "terão", "tendo",
    "haver", "há", "houver", "haja", "havia",
    "fazer", "faz", "fazem", "feita", "feito", "feitas", "feitos",
    "pode", "podem", "poderá", "poderão", "deve", "devem", "deverá", "deverão",
    "não", "sim", "caso", "bem", "tanto", "quais", "vez", "vezes",
    # --- jargão legislativo vazio (frequentíssimo em ementas) ---
    "dispõe", "dispondo", "dá", "dar", "providências", "providência",
    "altera", "alteração", "alterações", "alterando", "acrescenta",
    "acrescentando", "modifica", "modificando", "revoga", "revogando",
    "institui", "instituindo", "cria", "criação", "criando",
    "estabelece", "estabelecendo", "determina", "determinando",
    "denomina", "denominação", "inclui", "incluindo", "incluir",
    "lei", "leis", "decreto", "decretos", "artigo", "artigos", "art", "arts",
    "inciso", "incisos", "parágrafo", "parágrafos", "alínea", "alíneas",
    "caput", "nº", "nºs", "federal", "federais", "nacional", "nacionais",
    "outras", "outros", "fim", "fins", "respectivamente", "vigente",
    "redação", "dezembro", "janeiro", "fevereiro", "março", "abril", "maio",
    "junho", "julho", "agosto", "setembro", "outubro", "novembro",
    "anexo", "anexos", "termos", "forma", "âmbito", "relativo", "relativa",
    "relativos", "relativas", "referente", "referentes", "mediante",
    "através", "partir", "código", "data", "dia", "ano", "anos",
    # --- jargão processual / tramitação legislativa ---
    # (atos e instrumentos de processo que não carregam conteúdo temático)
    "requerimento", "requerimentos", "requer", "requeiro",
    "exarado", "exarada", "exara",
    "parecer", "pareceres",
    "relator", "relatora", "relatoria", "relatório", "relatorio",
    "proposição", "proposições", "proposicao", "proposicoes",
    "projeto", "projetos",
    "emenda", "emendas",
    "comissão", "comissões", "comissao", "comissoes",
    "tramitação", "tramitacao", "tramita",
    "voto", "votos", "votação", "votacao",
    "plenário", "plenario", "sessão", "sessao", "sessões", "sessoes",
    "aprovação", "aprovacao", "aprovado", "aprovada", "aprova",
    "apensação", "apensado", "apenso",
    "substitutivo", "subemenda",
    "autor", "autoria", "assinatura",
    "medida", "provisória", "provisoria",
    "resolução", "resolucao", "portaria",
    "câmara", "camara", "senado", "congresso",
    "deputado", "deputados", "senador", "parlamentar",
    "número", "numero", "prazo", "prazos",
    "ato", "atos", "norma", "normas",
    # --- termos de plenário / agenda / processo de votação ---
    "pauta", "pautas",
    "retirada", "retiradas", "retirar",
    "nominal", "nominais",
    "adiamento", "adiamentos", "adiada", "adiado", "adiar",
    "inversão", "inversao", "inverter", "inversa",
    "apreciação", "apreciacao", "apreciar",
    "discussão", "discussao", "discussões", "discussoes",
    "matéria", "materia", "matérias", "materias",
    "submete", "submeter", "submetido", "submetida",
    "realização", "realizacao", "realizar",
    "solicitação", "solicitacao", "solicita", "solicitar",
    "informações", "informacoes", "informação", "informacao",
    "moção", "mocao", "moções", "mocoes",
    "audiência", "audiencia", "audiências", "audiencias",
    "acerca", "republic",
    "prestados", "prestado", "prestada", "prestar",
    # --- abreviações e siglas que aparecem tokenizadas ---
    "dep", "req", "pdl", "pec", "ppl", "pdl", "mpv",
    # --- preposições / conectivos não capturados acima ---
    "sobre", "conforme", "segundo", "perante",
    # --- atos honoríficos (moção de louvor/regozijo, congratulações) ---
    "louvor", "louvores", "regozijo", "congratulação", "congratulacoes",
    "congratulatório", "excelentes", "excelente",
    # --- verbos/termos de tramitação restantes ---
    "executar", "executa", "execução", "execucao",
    "constante", "constantes",
    "outorgada", "outorgado", "outorgadas", "outorgados",
    "sugere", "sugerir", "sugerido",
    "renova", "renovar", "renovação", "renovado",
    "legislativa", "legislativo", "legislativas", "legislativos",
    "constitucionalidade", "juridicidade",
    # --- termos societários / abreviações ---
    "ltda", "ric", "senhor", "senhores", "senhora",
    "oficial", "oficiais",
})
