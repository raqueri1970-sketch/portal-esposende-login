# Almoxarifado
Auditar consumo, saldo e cobertura. Regra de atenção: cobertura inferior a três meses quando aplicável. Comparar lojas/períodos equivalentes e destacar consumo atípico com evidência, sem inferir causa sem dados.

## Fonte
- Base: `portal_sync` (module_id = `alm`), payload `dbConsumoRaw` (requisições), `dbEstoqueRaw` (saldo), `dbRegionaisMap` (loja → regional).
- Campos de consumo: `Data Solicitação`, `Empresa Solicitante` ("005 - CAMARAGIBE"), `Código`, `Insumo` (pode ter espaço duplo), `Qtd Solicitada`, `Qtd Atendida`, `Custo Atendido`, `Status`.
- Consumo = **Qtd Atendida** (não a solicitada). Pedidos com atendida = 0 não somam quantidade nem custo.
- Mês = mês da `Data Solicitação` (horário de Brasília).

## Custo real das embalagens de presente (obrigatório)
O custo gravado na base é o do Seta (antigo). Para os códigos abaixo, o custo oficial é o **custo real**: proposta Sulnove nº 010145 (29/10/2026), BOPP metalizado espessura **0,004**, + **DIFAL 13,5%** somado ao unitário.

| Código | Item | Tamanho | Milheiro | Unitário | Custo real/un. (+DIFAL) |
|---|---|---|---|---|---|
| 11314 | EMBALAGEM DE PRESENTE TAM (P) | 30x40 | R$ 331,00 | R$ 0,3310 | **R$ 0,3757** |
| 11315 | EMBALAGEM DE PRESENTE TAM (M) | 40x50 | R$ 535,75 | R$ 0,5358 | **R$ 0,6081** |
| 11316 | EMBALAGEM DE PRESENTE TAM (G) | 50x60 | R$ 799,50 | R$ 0,7995 | **R$ 0,9074** |

- Custo = Qtd Atendida × custo real/un. (arredondar por requisição a 2 casas). Saldo em estoque desses códigos também usa o custo real.
- Demais itens: `Custo Atendido` do Seta.
- Não mostrar observação, comparação ou "custo antigo" nos relatórios: apresentar só o custo real.
- Na tela, o patch `almox-consumo-item-patch.js` aplica o custo real em todo o módulo; a nuvem continua com o valor do Seta (por isso o Cérebro deve aplicar a tabela acima ao calcular).
- Referência jan–out/2026 (todas as lojas): 502.230 un. = **R$ 274.688,25** no custo real.

## Consumo por Item (botão 🔎 no módulo)
- Busca por parte do nome ou código (ex.: "embal"), marca/desmarca itens, Loja (ou todas), Regional e período (padrão = datas do painel).
- Mostra: consumo total, **média mensal** (só meses fechados; mês corrente aparece com * e fica fora da média), custo total, lojas que pediram; tabela item × mês (qtd + R$) e loja × mês.
- Exporta Excel (.xlsx), Imprimir e PDF.

## Padrão de relatório (regra)
- **Sempre** com a logo oficial da Esposende no topo (impressão, PDF e Excel). Logo em `LOGO_B64` no patch.
- Cabeçalho: logo + título + busca/loja/período + selo "Auditoria & Controle".
- Valores em **cards** coloridos: Consumo total, Média mensal, Custo total, Custo médio mensal, Lojas que pediram.
- Resumo por item em cards (quando 2 a 6 itens), com barra de % do consumo.
- Tabelas com cabeçalho azul-marinho (#14284a), linhas zebradas, Total e Média/mês destacados, linha de total marcada.
- Rodapé: "Esposende · Central de Auditoria & Controle" + data/hora de geração. A4 horizontal.
- Excel: logo e cards no topo de cada aba, sem linhas de grade, números em formato pt-BR.

## Consumo Loja (menu Almoxarifado → 🏬 Consumo Loja; botão também dentro do módulo)
Patch `almox-consumo-loja-patch.js`. Cruza o consumo (Qtd Atendida) dos itens controlados com o que gera esse consumo, aponta loja fora do padrão, prevê consumo e sugere compra.

| Linha | Códigos | Motor | Padrão |
|---|---|---|---|
| Sacolas | 7894, 8209, 9516, 11094, 21604 | PA (pares vendidos) | **regra fixa: 1 sacola a cada 1,5 PA** |
| Embalagem de presente | 11314, 11315, 11316 | PA | mediana das lojas, em **% das vendas que saem com presente** (embalagens ÷ PA) |
| Café / Pirulito / Balão (agrado) | 19388 / 15538 / 10546, 17314 | NFS (qtd de vendas); sem NFS usa PA | mediana das lojas (un./1.000 NFS) |
| Fita PP 45mm / Etiqueta 70x24 | 7816 / 7982, 15483 | pares remanejados enviados pela loja (origem) | mediana das lojas (un./1.000 pares) |
| Bobina PDV 79mm | 8002, 22203, 26104, 26153 | NFS | mediana das lojas (NFS por bobina) |
| Papel A4, filme stretch | 7981, 14580 | — | só histórico |

- Fonte do motor: `portal_sync` module_id = `almcl` → `vendas[{loja,mes,pares,nfs,valor}]`, `remanejo[{loja,mes,pares,pedidos}]`, `params`. Carregada na aba "Base de vendas e remanejo" (xlsx/csv; tipo reconhecido pelas colunas; carga nova troca só loja×mês do arquivo). Não existe venda por loja/mês em outro módulo da nuvem; o Remanejo só guarda o detalhe de 14 a 29/09/2026.
- Comparação no **acumulado dos meses fechados** (loja pede a cada 2–3 meses). Índice da loja = consumo ÷ motor; Esperado = motor × padrão; Desvio = índice ÷ padrão − 1.
- Situação: ACIMA (> +tolerância, padrão 25%), ABAIXO (< −tolerância), VENDE E NÃO PEDE (tem motor e consumo zero), POUCO DADO (motor < 20% da mediana), CD fora do padrão (entra no total). Padrão por mediana exige ≥ 3 lojas com base.
- Previsão mensal: motor = média dos meses fechados × (1 + crescimento, padrão 10%) nos meses comuns e × **fator de dezembro (padrão 2,75; a venda de dezembro é 2,5x a 3x um mês comum)** em dezembro — só para venda, agrado e bobina; remanejo e histórico sem fator. Consumo = motor previsto × padrão da rede (ou índice real da loja, parâmetro). Loja sem motor e CD: média de consumo. Item = previsão da linha × participação do item.
- Sugestão de compra = soma da previsão dos meses de cobertura a partir do mês corrente (padrão 3: ex. NOV + DEZ + JAN) − estoque atual (`dbEstoqueRaw`); embalagens no custo real. O pedido de dezembro sai das lojas em novembro.
- Loja com base em menos da metade dos meses da rede = LOJA NOVA (fora do padrão; recebe enxoval na inauguração).
- Relatório de vendas do sistema (`REPORTGROUP;QUANTIDADE;AVISTA;APRAZO;TOTAL;CUSTO;...`, um arquivo por mês) é aceito: QUANTIDADE = PA, TOTAL = valor, mês pelo nome do arquivo (FEVEREIRO.CSV). Não traz NFS: agrado e bobina usam PA até ter a quantidade de vendas.
- `ESTOQUE_LOJAS` (REPORTGROUP;CODIGO;DESCRICAO;...) **não serve** como saldo de insumo na loja: a loja recebe e não dá baixa no uso (ex.: 7,6 mi sacolas "em estoque" nas lojas x ~2 mi consumidas no ano). O módulo recusa esse arquivo na base de vendas.
- Referência real (FEV/ABR/AGO 2026, rede): 1,19 / 1,16 / 1,57 PA por sacola (regra 1,5); presente 14,8% / 31,1% (abastecimento do Dia das Mães) / 13,7% das vendas.
- Saídas: Painel em cards, Comparativo entre lojas, Relatório mensal (itens × mês, qtd e R$, busca por loja/regional), Previsão & compra, Relatório Gerencial (impressão/PDF com logo) e Excel (Gerencial, Mensal, Comparativo, Previsão por loja, Sugestão de compra, Bases).
