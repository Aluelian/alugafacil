# AlugaFacil

Sistema web para gerenciamento de aluguel de equipamentos, com cadastro de usuarios,
controle de estoque, fluxo de alugueis e painel administrativo.

## Sobre o projeto

O AlugaFacil foi desenvolvido para praticar uma aplicacao completa com backend,
frontend, autenticacao, persistencia de dados e indicadores operacionais.

## Funcionalidades

- Cadastro e login de usuarios
- Autenticacao com JWT
- Controle de acesso por perfil de usuario
- Catalogo de equipamentos para aluguel
- Criacao de alugueis com calculo do valor total
- Cancelamento e finalizacao de alugueis
- Atualizacao automatica do estoque
- Cadastro, edicao e remocao de equipamentos por administradores
- Dashboard com indicadores de operacao
- Filtros por periodo, status e escopo
- Relatorios com exportacao para CSV
- Graficos de receita e volume mensal
- Heatmap semanal de alugueis
- Indicadores de estoque e cancelamento
- Metas mensais com historico de alteracoes
- Comparativo anual e projecoes baseadas no historico de receita
- Exportacao do relatorio executivo para PDF

## Tecnologias

- Node.js
- Express
- SQLite3
- JWT
- HTML, CSS e JavaScript

## Como executar

### 1. Instalar as dependencias

```bash
npm install
```

### 2. Configurar as variaveis de ambiente

Copie `.env.example` para `.env` e defina uma chave segura:

```env
PORT=3000
JWT_SECRET=sua-chave-secreta-forte
```

### 3. Iniciar a aplicacao

```bash
npm run dev
```

Abra no navegador:

- Aplicacao: http://localhost:3000
- Painel executivo: http://localhost:3000/bi.html

## Publicar para outras pessoas

O projeto pode ser publicado como um Web Service no Render:

1. Envie o projeto para um repositorio no GitHub.
2. No Render, escolha `New > Web Service` e conecte o repositorio.
3. Use `npm install` como comando de build.
4. Use `npm start` como comando de inicializacao.
5. Cadastre a variavel `JWT_SECRET` com uma chave forte.
6. Aguarde o deploy e compartilhe a URL gerada.

O arquivo `render.yaml` ja deixa esses dados pre-configurados para um deploy inicial.
Como o projeto usa SQLite, o plano gratuito deve ser tratado como demonstracao:
os dados podem ser perdidos quando o servico for recriado ou reiniciado. Para uso
permanente, o banco deve ser migrado para um servico persistente, como PostgreSQL,
ou hospedado em um ambiente com disco persistente.

## Endpoints principais

### Autenticacao

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Equipamentos

- `GET /api/items`
- `POST /api/items`
- `PUT /api/items/:id`
- `DELETE /api/items/:id`

### Alugueis

- `POST /api/rentals`
- `GET /api/rentals/my`
- `GET /api/rentals/report`
- `PATCH /api/rentals/:id/finish`
- `PATCH /api/rentals/:id/cancel`

### Metas

- `GET /api/goals/:monthKey`
- `PUT /api/goals/:monthKey`
- `GET /api/goals/:monthKey/history`

### Verificacao da API

- `GET /api/health`

## Estrutura

```text
src/
  db.js
  server.js
  middleware/
    auth.js
    requireAdmin.js
  routes/
    auth.routes.js
    goals.routes.js
    items.routes.js
    rentals.routes.js
public/
  index.html
  style.css
  app.js
  bi.html
  bi.css
  bi.js
```

## Validacao

O roteiro de testes manuais esta em [TESTES_MANUAIS.md](TESTES_MANUAIS.md).
Ele cobre autenticacao, catalogo, estoque, alugueis, relatorios e painel executivo.

## Licenca

Este projeto esta disponivel sob a licenca MIT.
