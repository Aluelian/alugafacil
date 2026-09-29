# Revisao guiada (arquivo por arquivo)

Objetivo: entender o projeto inteiro com foco em arquitetura e fluxo real.
Tempo sugerido: 60 a 90 minutos.

## Etapa 1 - Backend base

### 1) src/server.js
- O que observar:
  - inicializacao do Express
  - middlewares globais (CORS, JSON, arquivos estaticos)
  - registro das rotas de API
  - healthcheck
- Resultado esperado:
  - voce explica onde uma rota nasce e como ela vira endpoint acessivel.

### 2) src/db.js
- O que observar:
  - funcoes utilitarias (run/get/all)
  - criacao de tabelas
  - relacoes entre users, items, rentals, goals, goals_history
  - seed inicial de itens
- Resultado esperado:
  - voce entende o modelo de dados e por que cada tabela existe.

### 3) src/middleware/auth.js e src/middleware/requireAdmin.js
- O que observar:
  - validacao do token Bearer
  - injecao do usuario em req.user
  - bloqueio de rotas admin
- Resultado esperado:
  - voce consegue explicar autorizacao vs autenticacao.

## Etapa 2 - Rotas de negocio

### 4) src/routes/auth.routes.js
- O que observar:
  - registro/login
  - emissao JWT
  - endpoint /me
- Resultado esperado:
  - voce entende ciclo de sessao do usuario.

### 5) src/routes/items.routes.js
- O que observar:
  - listagem publica
  - CRUD admin
  - validacoes de entrada
- Resultado esperado:
  - voce entende governanca de catalogo.

### 6) src/routes/rentals.routes.js
- O que observar:
  - criacao de aluguel
  - finalizacao/cancelamento
  - atualizacao de estoque
  - relatorio, YoY e previsao
- Resultado esperado:
  - voce explica ponta a ponta o core do produto.

### 7) src/routes/goals.routes.js
- O que observar:
  - metas por mes
  - historico de alteracoes
- Resultado esperado:
  - voce entende persistencia de metas e trilha de auditoria.

## Etapa 3 - Frontend operacional

### 8) public/index.html + public/style.css
- O que observar:
  - estrutura da tela principal
  - blocos: auth, dashboard, admin, relatorios
- Resultado esperado:
  - voce reconhece os componentes visuais do fluxo.

### 9) public/app.js
- O que observar:
  - funcoes de API
  - renderizacao de listas e indicadores
  - filtros e exportacoes
- Resultado esperado:
  - voce entende como o estado da tela conversa com a API.

## Etapa 4 - Frontend BI

### 10) public/bi.html + public/bi.css + public/bi.js
- O que observar:
  - KPIs executivos
  - metas, historico, simulador
  - grafico, heatmap e PDF
- Resultado esperado:
  - voce entende a camada de analise e decisao.

## Conclusao rapida

Se conseguir responder sem consultar codigo:
1. Como o token e validado?
2. Onde o estoque sobe e desce?
3. Como a previsao e calculada?
4. Onde as metas ficam persistidas?

Se respondeu os 4 pontos, voce consolidou bem o projeto.
