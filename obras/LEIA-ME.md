# Telas de pagamento de Obras & Reformas

Cópia publicada das telas do repositório `sistema-de-auditoria` (pastas `obras-*`).
Abertas dentro do módulo Obras & Reformas do Portal pelo `obras-pagamentos-patch.js`, com a mesma sessão do Portal.

Para atualizar: copie de novo as pastas `obras-contas-pagar`, `obras-presidente`
e `obras-relatorios` do `sistema-de-auditoria` para cá. Não edite os arquivos aqui direto.

## Desconto em Folha · Crediário (25/10/2026)

`obras/desconto-folha/` é a cópia da tela `desconto-folha/` do `sistema-de-auditoria` (usa o `comum.js` de `obras-contas-pagar/`).
Aberta pelos cards "Desconto em Folha · Crediário" e "Ex-funcionários · Crediário" e pelo grupo "Crediário" do menu
(`crediario-patch.js`). Para atualizar, copie de novo `desconto-folha/index.html`.

Atualizada em 26/10/2026 (PRs #56 e #57 do `sistema-de-auditoria`): três bases — compras em loja (COMPRA EM LOJA e crediário = devido),
funcionários e ex-funcionários, folha de pagamento (FOLHA MM-AAAA, aba Sheet1, verba 1260 = descontado) — rescisão conferida com o
saldo, e o painel com compras do mês × compras anteriores × rescisão e a conciliação devido → descontado.
