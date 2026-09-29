# Guia de estudo (nivel iniciante -> intermediario)

Este guia ajuda a revisar o projeto sem adicionar nova complexidade.

## 1) Entender o fluxo principal

1. Registrar usuario
2. Fazer login
3. Listar itens
4. Criar aluguel
5. Cancelar/finalizar aluguel
6. Conferir impacto no estoque

## 2) Revisar backend por ordem

1. src/server.js
2. src/db.js
3. src/middleware/auth.js
4. src/routes/auth.routes.js
5. src/routes/items.routes.js
6. src/routes/rentals.routes.js
7. src/routes/goals.routes.js

Objetivo: conseguir explicar cada arquivo em 2-3 frases.

## 3) Revisar frontend por ordem

1. public/index.html
2. public/style.css
3. public/app.js
4. public/bi.html
5. public/bi.css
6. public/bi.js

Objetivo: entender como os componentes visuais conversam com a API.

## 4) Checklist de consolidacao

- Sei o que e JWT e onde ele e salvo.
- Sei como o role admin libera o painel administrativo.
- Sei como o endpoint /api/rentals/report monta os indicadores.
- Sei como metas sao salvas no banco e como historico e gerado.
- Sei como o BI mostra tendencia, YoY e previsao.

## 5) Proxima pratica segura

- Alterar apenas textos e labels da interface.
- Adicionar um novo KPI simples no BI.
- Criar um teste manual em README com passos de validacao.

Se algum bloco acima ficar confuso, vale pausar e revisar antes de adicionar novas features.
