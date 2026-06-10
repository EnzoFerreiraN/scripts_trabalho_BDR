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
})
