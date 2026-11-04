---
name: crediario-auditoria
description: Auditoria do Crediário / Desconto em Folha da Esposende (pasta crediario/ do Portal) — compras em loja no crediário descontadas na folha (verba 1260 "Compra Loja") e na rescisão (TRCT). Use sempre que o pedido envolver crediário, desconto em folha, verba 1260, compras de funcionário, BAIXA.CSV, baixas do Seta, rescisão/TRCT de ex-funcionário, "não descontados", erro de centavos do RH, perda/ganho, conta corrente, decisões da auditoria (procede/não procede), planilhas ou PDFs desse módulo, importar folha/compras/desligados, ou corrigir/auditar números do crediário.
---

# Auditoria do Crediário — Esposende

Portal estático (GitHub Pages, branch `main`) + Supabase (projeto `rdztzurfesnobfkazgpm`). O módulo é `crediario/index.html` (toda a lógica: importação, `cruzar()`, telas, relatórios), com `crediario/comum.js` e `comum.css`; abre pelo Portal via `crediario-patch.js`. **Não misturar com o módulo de Obras.**

Usuário: Ricardo (auditoria). Responder em PT-BR, **objetivo**, sempre com **totais**, perda em vermelho / ganho em verde, e dizer **o que faltou parcela a parcela** (nunca só "descontou a menos"). Ele já perdeu tempo com número errado: conferir antes de afirmar.

## Fontes de dados (importação no portal)

| Card | Arquivo | Tabela |
|---|---|---|
| 1 · Compras em loja | Seta "COMPRA EM LOJA" / Crediário 2026 (documento `CE123456-2/6`) | `cred_parcelas` (chave, cpf, documento, contrato, parcela, n_parcelas, lancamento, vencimento, valor) |
| 2 · Folha | `FOLHA_MM-AAAA.xlsx` do RH (verba 1260 "Compra Loja") | `cred_folha` (cpf, competencia, evento, valor, data_pagamento) |
| 3 · Cadastro / Desligados | ativos e desligados do RH | `cred_funcionarios`, `cred_desligados` (saida, natureza) |
| 4 · Baixas | `BAIXA.CSV` do Seta (REPORTGROUP;DATA;ITEM;NOME;DOCUMENTO;RP;VALOR — **sem CPF**) | `cred_baixas` (chave `doc|parcela|cpf|data|valor`) |
| TRCT manual | botão "Informar TRCT" | `cred_folha` com arquivo `origem='trct'` |

Gravação só pela RPC `cred_importar(p_arquivo, p_linhas)` (checa `cred_pode_auditar`). Outras tabelas: `cred_tratativas` (tratativa de pendência), `cred_fechamentos`, `cred_config` (regra ciclo, corte 20, tolerância 0,05), **`cred_decisoes`** (decisões da auditoria, ver abaixo). RLS de todas: `cred_pode_auditar()`.

## Regras de negócio (não quebrar)

- **Ciclo**: compra de 21 a 20 vai para a folha daquele mês; a diferença de uma folha passa para a próxima (compensação/acúmulo).
- **Baixa = RH pagou a folha**: um lote por mês, ~dia 20 do mês seguinte (lote 22/09 = folha 08). Cada lote é ligado à folha que mais bate pessoa a pessoa (`loteComp`, `loteBoa`). **Lotes de 09/02 e 26/02/2026 misturam dez/2025** (folha de 2025 não importada) — jan/2026 nunca é base confiável.
- **CPF da baixa** (o BAIXA.CSV não tem CPF): coluna CPF › número da compra **só se o nome bater** com o dono (o CE… se repete entre pessoas) › nome exato › nome abreviado de 2 palavras (ex.: "MARIA SOUZA") › 1º nome com erro e resto igual (ex.: "ELISABERTE" por "ELIZABETE") › homônimo desempatado pelo valor da folha › parcela irmã (mesma compra, mesmo nº de parcelas, mesmo nome). Todas exigem **uma pessoa só**.
- **Rescisão**: na saída **todo o saldo vence** (ex-funcionário não tem "a vencer"). Saldo = parcelas da folha do mês da saída em diante (+ saldo de folhas anteriores); falta = saldo − verba 1260 da folha da rescisão (ou TRCT informado). O desconto paga primeiro o saldo anterior e depois as parcelas por vencimento (`faltouResc`).
- **Conta corrente (prova final)**: total descontado (1ª folha → rescisão) × tudo baixado a partir do lote dessa folha + parcelas em aberto, **com e sem jan/2026**; vale o **menor** déficit. Perda/ganho só fica se as duas confirmarem; senão "A conferir". Mês em que a folha descontou mais do que o lote baixou aparece na observação ("pedir a lista Diversos do RH").
- **Erro de centavos do RH**: lançou 1,29 em vez de 129,00. "Certo" só se fecha ao centavo e nenhum subconjunto de compras inteiras explica a diferença; senão "Possível".
- **Plano BRA** (funeral/telemedicina, doc `BRA2026…`): mensalidade, não compra — para ex-funcionário só a do mês da saída entra no saldo.
- **Decisões** (`cred_decisoes`, a mais recente de cada `chave` vale): `resc:<cpf>|<saida>` (rescisão) e `nd:<cpf>|<ids das pendências>` (não descontado de ativo). Procede / Já recuperado / Não procede / Valor ajustado tiram o caso dos relatórios em aberto e fecham as pendências cobertas; "Em análise" mantém; "Reaberto" volta. A decisão grava a **foto** dos valores (`detalhe`) — importação nova não muda o que foi decidido; falta de mês novo gera caso novo. Aba **Decisões**: busca (nome, CPF, motivo, CE…, observação, quem), filtros por tipo/decisão/mês, PDF/planilha por mês, por decisão ou lista.

## Armadilhas já encontradas

Detalhe e consultas em `references/armadilhas-e-sql.md`. Resumo: contrato CE repetido entre pessoas (430 baixas no CPF errado), lote de jan misturado com dez/2025 (falsos ganhos/perdas), parcela baixada antes de existir folha, homônimos, nome abreviado no Seta, desconto da folha maior que a baixa por meses seguidos (jun/jul/set/2026 ~R$ 13–19 mil/mês, sistêmico — compra fora do Seta ou lançamento do RH), mensalidade BRA tratada como dívida, `pkill` no mesmo comando derruba o shell.

## Como trabalhar

1. **Conferir no banco antes de afirmar** (MCP Supabase `execute_sql`): duplicidades, CPF × nome, datas fora do vínculo, conta corrente da pessoa — consultas prontas em `references/armadilhas-e-sql.md`.
2. **Simular a mudança antes de publicar** (sem gravar nada):
   - Base exportada `D.json` (objeto `D` da página: `arquivos, parcelas, funcionarios, folha, baixas, cfg, tratativas, fechamentos, desligados, decisoes`). No navegador logado no módulo: console → `copy(JSON.stringify(D))` e salvar em arquivo.
   - `python3 -m http.server 8765` na raiz do repo (em comando separado; nunca `pkill` junto).
   - `node .claude/skills/crediario-auditoria/scripts/simular.js D.json [BAIXA.CSV|-] [trct.json|-] saida.png` → `saida.json` (totais e cada ex-funcionário) e `saida-real.json` (pendências). `trct.json` = `{"cpf": "558,35"}` para TRCTs ainda sem folha.
   - Validar contra casos que o Ricardo já conferiu no TRCT (anotados por ele à caneta) antes de publicar números novos.
3. **Planilhas** (precisam de `xlsx`: `npm i xlsx` num diretório de trabalho e `NODE_PATH="$NODE_PATH:<dir>/node_modules"`):
   - Não descontados: `scripts/planilha-nao-descontados.js saida-real.json saida.json nao-descontados.xlsx`
   - Erros de centavos: `scripts/planilha-centavos.js saida-real.json erro-centavos-rh.xlsx` (cruzar com "Cobrar na rescisão" do `saida.json`)
   - Rescisões (perda/ganho/a conferir): `scripts/planilha-rescisoes.js saida.json auditoria-rescisoes.xlsx`
   - "Sem erro de centavos" = não descontados filtrando a coluna "Erro de centavos" vazia, com resumo por motivo.
   Entregar no scratchpad e enviar ao usuário; nunca commitar planilha com dados pessoais no repo.
4. **Correção no banco**: sempre com backup antes (ex.: `cred_baixas_bkp_AAAAMMDD`) e conferir contagens depois. Alteração de schema por `apply_migration` com RLS `cred_pode_auditar()`.
5. **Publicar**: branch nova a partir de `main`, checar sintaxe (`new Function` dos `<script>`), rodar a simulação, PR e merge (o Ricardo autorizou "coloque no portal"). Lembrar o usuário de **Ctrl+F5**.

## Pendências recorrentes para pedir ao RH

- Lista **"Diversos"** do RH (o que entrou na verba 1260 por pessoa) — explica desconto sem baixa e "possível erro de centavos".
- Folha do mês da rescisão ou valor do TRCT (botão "Informar TRCT").
- Lote de baixa e folha de dez/2025 — fecha a conta corrente de janeiro.
- Confirmar saídas que não estão no relatório de desligados (saída "não confirmada").
