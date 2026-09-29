# Roteiro de testes manuais

Objetivo: validar funcionalidades criticas sem precisar escrever teste automatizado agora.

## Preparacao

1. Inicie o projeto com npm run dev.
2. Abra http://localhost:3000.
3. Tenha duas contas se possivel:
   - Conta A (admin)
   - Conta B (cliente)

## Bloco A - Autenticacao

### A1. Registro
- Passos:
  1. Criar conta nova.
- Esperado:
  - mensagem de sucesso
  - usuario consegue fazer login

### A2. Login
- Passos:
  1. Entrar com credenciais validas.
- Esperado:
  - dashboard abre
  - token salvo em localStorage

### A3. Sessao invalida
- Passos:
  1. Limpar token manualmente e recarregar.
- Esperado:
  - retorno para estado de login

## Bloco B - Catalogo e admin

### B1. Listagem de itens
- Esperado:
  - itens seed aparecem

### B2. Criacao de item (admin)
- Passos:
  1. Criar item no painel admin.
- Esperado:
  - item aparece na lista e no select de aluguel

### B3. Edicao de item (admin)
- Esperado:
  - dados atualizados refletem na tela

### B4. Restricao de acesso
- Passos:
  1. Login com conta cliente.
- Esperado:
  - painel admin oculto

## Bloco C - Alugueis

### C1. Criar aluguel
- Esperado:
  - aluguel criado
  - estoque do item reduz

### C2. Cancelar aluguel
- Esperado:
  - status vira cancelled
  - estoque retorna

### C3. Finalizar aluguel
- Esperado:
  - status vira finished
  - estoque retorna

### C4. Filtros de aluguel
- Esperado:
  - status/busca/data filtram corretamente

## Bloco D - Relatorios

### D1. Atualizar relatorio
- Esperado:
  - KPIs atualizados
  - listas de top itens e evolucao mensal preenchidas

### D2. Exportar CSV
- Esperado:
  - arquivo baixado com colunas corretas

### D3. BI executivo
- Acesse http://localhost:3000/bi.html
- Esperado:
  - KPIs + grafico + heatmap + alertas visiveis

### D4. Metas mensais
- Passos:
  1. Salvar metas.
  2. Atualizar tela.
- Esperado:
  - metas persistem
  - historico de alteracao cresce

### D5. Exportar PDF
- Esperado:
  - janela de impressao abre
  - layout A4 legivel

## Critario de pronto

Projeto considerado estavel para estudo quando:
- todos os testes A, B, C e D passam
- nenhum erro bloqueante aparece no console do navegador
- o servidor permanece de pe durante os fluxos
