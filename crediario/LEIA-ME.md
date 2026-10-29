# Crediário · Desconto em Folha

Módulo próprio do Crediário, separado de Obras & Reformas (29/10/2026). Nada aqui depende da pasta `obras/`.

- `index.html` — a tela (cópia da tela `desconto-folha/` do repositório `sistema-de-auditoria`).
- `comum.js` — só o que a tela usa: login do Portal, formatação, PDF e gráficos. Sem tabelas nem telas de Obras.
- `comum.css` e `logo-esposende.jpg` — visual da tela.

Aberta pelos cards "Desconto em Folha · Crediário" e "Ex-funcionários · Crediário" e pelo grupo "Crediário" do menu
(`crediario-patch.js` na raiz). Dados: só as tabelas `cred_*` do Supabase.

Para atualizar: copie de novo `desconto-folha/index.html` do `sistema-de-auditoria` para cá e troque os caminhos
`../obras-contas-pagar/comum.css`, `../obras-contas-pagar/comum.js` e `../obras-contas-pagar/logo-esposende.jpg`
por `comum.css`, `comum.js` e `logo-esposende.jpg`. Se a tela nova usar alguma função que não está no `comum.js`
daqui, traga só essa função.

## Histórico

Atualizada em 26/10/2026 (PRs #56 e #57 do `sistema-de-auditoria`): três bases — compras em loja (COMPRA EM LOJA e crediário = devido),
funcionários e ex-funcionários, folha de pagamento (FOLHA MM-AAAA, aba Sheet1, verba 1260 = descontado) — rescisão conferida com o
saldo, e o painel com compras do mês × compras anteriores × rescisão e a conciliação devido → descontado.
