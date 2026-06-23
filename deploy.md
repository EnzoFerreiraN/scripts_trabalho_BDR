# Deploy Completo de Aplicação FastAPI + React + SQLite no Railway

## Objetivo

Realizar o deploy completo desta aplicação utilizando o Railway, fazendo uso da Skill e MCP do Railway sempre que disponíveis.

A aplicação possui a seguinte estrutura:

```text
backend/
frontend/
```

Atualmente existe um banco SQLite com aproximadamente 700 MB utilizado apenas para consultas. Não há inserções ou alterações de dados durante a execução da aplicação.

---

## Requisitos Obrigatórios

### 1. Analisar o Projeto

* Inspecionar toda a estrutura do repositório.
* Identificar dependências do backend e frontend.
* Verificar como o SQLite é acessado atualmente.
* Verificar variáveis de ambiente necessárias.
* Identificar possíveis problemas para execução em containers.


---

### 2. Dockerização

Dockerizar completamente a aplicação.

Criar:

* Dockerfile para o backend FastAPI.
* Dockerfile para o frontend React.
* Arquivos necessários para produção.
* Configurações adequadas para execução no Railway.

Garantir que:

* O backend escute em `0.0.0.0`.
* A porta seja obtida da variável `PORT` fornecida pelo Railway.
* A imagem final seja otimizada para produção.

---

### 3. Adaptar SQLite para Volume Persistente

O banco SQLite NÃO deve ficar dentro do repositório Git.

Criar um Volume Persistente no Railway e armazenar o banco nele.

O backend deve ser adaptado para utilizar um caminho semelhante a:

```python
sqlite:////data/banco.db
```

ou o caminho equivalente definido pelo volume.

Requisitos:

* Verificar se o banco existe durante o startup.
* Registrar logs claros caso o arquivo não seja encontrado.
* Garantir que o banco seja aberto em modo somente leitura quando possível.
* Remover dependências do banco local do repositório.

---

### 4. Configuração do Railway

Utilizando o MCP do Railway:

* Criar os serviços necessários.
* Configurar as variáveis de ambiente( SE EXISTIR ).
* Configurar o Volume Persistente.
* Associar o volume ao backend.
* Configurar build e start commands adequadamente.

Sempre priorizar a automação utilizando o MCP do Railway ao invés de instruções manuais.

---

### 5. Deploy

Realizar o deploy completo da aplicação.

Etapas:

1. Build do frontend.
2. Build do backend.
3. Deploy dos containers.
4. Montagem do volume.
5. Inicialização dos serviços.

---

### 6. Domínio Público

Criar e configurar um domínio público do Railway.

Requisitos:

* URL pública funcional.
* Backend não precisa ser acessado por fora, apenas pelo front internamente.
* Frontend acessível externamente.
* Ajustar CORS quando necessário.

Validar que o frontend consegue consumir a API publicada.

---

### 7. Testes Pós-Deploy

Executar validações reais após o deploy.

Verificar:

#### Backend

* Health check.
* Rotas principais.
* Conexão com SQLite.
* Consultas reais ao banco.

#### Frontend

* Carregamento da aplicação.
* Consumo da API.
* Erros de console.

#### Integração

* Fluxo completo frontend → backend → SQLite.

---

### 8. Verificação de Logs

Após o deploy:

* Analisar logs do backend.
* Analisar logs do frontend.
* Procurar erros de inicialização.
* Procurar erros de acesso ao volume.
* Procurar erros de CORS.
* Procurar erros de build.

Caso encontre problemas:

* Corrigir.
* Fazer novo deploy.
* Revalidar.

---

### 9. Relatório Final

Ao final fornecer:

#### Arquivos criados

Lista completa dos arquivos adicionados ou alterados.

#### Configurações realizadas

* Docker
* Railway
* Volume
* Variáveis de ambiente ( se necessário )
* Domínio

#### URLs

* Frontend
* Health Check

#### Resultado dos testes

Informar:

* Testes executados
* Resultado de cada teste
* Logs relevantes

#### Problemas encontrados

Descrever:

* Problema
* Causa
* Solução aplicada

---

## Critério de Conclusão

A tarefa somente pode ser considerada concluída quando:

* O frontend estiver acessível publicamente.
* O SQLite estiver sendo lido a partir do Volume Persistente.
* Todos os testes passarem.
* Os logs estiverem sem erros críticos.
* O domínio público estiver funcionando corretamente.
* O relatório final tiver sido entregue.

```
```
