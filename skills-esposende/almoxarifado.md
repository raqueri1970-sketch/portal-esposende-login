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
| Sacolas | 7894, 8209, 9516, 21604 (11094 sacola antiga 25x35 fora das contas: sobra, não é mais comprada) | PA (pares vendidos) | **regra fixa: 1 sacola a cada 1,5 PA** |
| Embalagem de presente | 11314, 11315, 11316 | PA | mediana das lojas, em **% das vendas que saem com presente** (embalagens ÷ PA) |
| Café (agrado + equipe) | 19388 | **Regra da Controladoria:** teórico (cafezinhos) = visitantes × 60% (visitantes = vendas ÷ conversão 33%) + 20 funcionários × 2 cafezinhos/dia × 26 dias × meses (ES Sports: quadro da Base Mãe); teórico em pacotes = ÷ 30 cafezinhos/pacote (garrafa térmica). **Esperado = teórico × fator do porte** (P/M/G/GG pelos quartis de pares/mês; ES Sports à parte). O fator sai só das lojas **dentro da tolerância** do porte (exclui as fora e recalcula). Jan–out/26: P 7,4% · M 7,8% · G 6,3% · GG 6,1% do teórico (rede ≈ 6,9%: 13,9 mil pacotes x 201,6 mil teóricos). Parâmetros editáveis na tela | resíduo vs. porte |
| Pirulito / Balão (agrado) | 15538 / 10546, 17314 | NFS (qtd de vendas); sem NFS usa PA | mediana das lojas (un./1.000 NFS) |
| Fita PP 45mm / Etiqueta 70x24 | 7816 / 7982, 15483 | pares remanejados enviados pela loja (origem); etiqueta usa pares vendidos enquanto não houver base de remanejo | mediana das lojas; **etiqueta: 1 rolo = 630 etiquetas, medida em etiquetas por par** (mediana jan–out/26 = 1,46). Remanejo sem fator de dezembro. Anomalia: 028 ES Sports Manaíra pediu 1.000 rolos (630 mil etiquetas) em set/26 para 4.844 pares no ano |
| Bobina PDV 79mm | 8002, 22203, 26104, 26153 | NFS | mediana das lojas (NFS por bobina) |
| Papel A4, filme stretch | 7981, 14580 | — | só histórico |

- Fonte do motor: `portal_sync` module_id = `almcl` → `vendas[{loja,mes,pares,nfs,valor}]`, `remanejo[{loja,mes,pares,pedidos}]`, `params`. Carregada na aba "Base de vendas e remanejo" (xlsx/csv; tipo reconhecido pelas colunas; carga nova troca só loja×mês do arquivo). Não existe venda por loja/mês em outro módulo da nuvem; o Remanejo só guarda o detalhe de 14 a 29/09/2026.
- Comparação no **acumulado dos meses fechados** (loja pede a cada 2–3 meses). Índice da loja = consumo ÷ motor; Esperado = motor × padrão; Desvio = índice ÷ padrão − 1.
- Situação: ACIMA (> +tolerância, padrão 25%), ABAIXO (< −tolerância), VENDE E NÃO PEDE (tem motor e consumo zero), POUCO DADO (motor < 20% da mediana), CD fora do padrão (entra no total). Padrão por mediana exige ≥ 3 lojas com base.
- Previsão mensal: motor = média dos meses fechados × (1 + crescimento, padrão 10%) nos meses comuns e × **fator de dezembro (padrão 2,75; a venda de dezembro é 2,5x a 3x um mês comum)** em dezembro — só para venda, agrado e bobina; remanejo e histórico sem fator. Consumo = motor previsto × padrão da rede (ou índice real da loja, parâmetro). Loja sem motor e CD: média de consumo. Item = previsão da linha × participação do item.
- **Baliza de sacola por tamanho (Controladoria): P 35% · M 50% · G 15%** (P = 9516 35x55, M = 7894 50x60, G = 8209 60x70; ajustável no menu). A previsão e a sugestão de compra repartem a sacola por essa baliza (antiga 11094 e ES Sports 21604 mantêm a participação histórica). O comparativo de sacolas mostra o mix de cada loja e destaca desvio > 10 p.p. Real jan–out/2026 (rede sem CD): P ~23% · M ~48% · G ~28% — G quase o dobro da baliza.
- **Estoque vem do módulo Almoxarifado** (`dbEstoqueRaw`), carregado com o relatório de estoque do sistema com os depósitos **001 CD + AX - ALMOXARIFADO CONDE**: o módulo soma os depósitos por código. A planilha de estoque carregada no Consumo Loja só vale se for mais nova que o módulo.
- **Armadilha do código do item:** o relatório de estoque grava o código com zeros à esquerda (`007894`) e as requisições sem (`7894`). O módulo cruza estoque x consumo pelo texto exato: até 06/11/2026 nenhum item casava (cada insumo aparecia 2x: consumo com estoque 0 = CRÍTICO, e estoque cheio = SEM CONSUMO). Desde então o `almox-consumo-item-patch.js` padroniza `Código` sem zeros (dbEstoqueRaw, dbEstoqueTI, dbConsumoRaw, estoqueMinOverrides) antes de cada cálculo, e a nuvem foi padronizada. Ao cruzar no SQL, sempre usar `ltrim(Código,'0')`.
- **Armadilha do CSV de estoque:** a polegada vem como `&QUOT;` na descrição (ex.: `"ARRUELA 1/4&QUOT;"`); o `;` da entidade quebra a coluna no leitor do módulo (separa por `;` sem respeitar aspas) e a QUANTIDADE vira 0. Desde 06/11/2026 o `almox-consumo-item-patch.js` troca as entidades HTML antes da leitura (`__csvEntidadesFix`). Em 06/11 seis itens de obra (17448, 17957, 25284, 17955, 16699, 24265) foram corrigidos na nuvem.
- Sugestão de compra = soma da previsão dos meses de cobertura a partir do mês corrente (padrão 3: ex. NOV + DEZ + JAN) − estoque atual (`dbEstoqueRaw`); embalagens no custo real. O pedido de dezembro sai das lojas em novembro.
- **LOJA NOVA (fora do padrão e de acima/abaixo):** loja cuja 1ª venda é depois do 1º mês da rede (inaugurada no período — o pedido de abertura, ex. Juazeiro 24 mil sacolas em mai/26, é estoque inicial e não consumo) ou com venda em menos da metade dos meses (fechada/reaberta, ex. Shop Recife). Consumo comparado = só o pedido nos meses com venda (o pedido antes da 1ª venda aparece à parte). Auditoria 07/11/2026: PA da tela bate 100% com os arquivos de venda jan–out (3.093.721 pares).
- Relatório de vendas do sistema (`REPORTGROUP;QUANTIDADE;AVISTA;APRAZO;TOTAL;CUSTO;...`, um arquivo por mês) é aceito: QUANTIDADE = PA, TOTAL = valor, mês pelo nome do arquivo (FEVEREIRO.CSV). Não traz NFS: **regra — cada venda é uma NF**, então NFS = QUANTIDADE vendida (agrado e bobina medidos por NF).
- `ESTOQUE_LOJAS` (REPORTGROUP;CODIGO;DESCRICAO;...) **não serve** como saldo de insumo na loja: a loja recebe e não dá baixa no uso (ex.: 7,6 mi sacolas "em estoque" nas lojas x ~2 mi consumidas no ano). O módulo recusa esse arquivo na base de vendas. **Regra (decisão da Controladoria, 06/11/2026): desconsiderar sacolas e demais insumos que já existem no estoque da loja** — comparação, previsão e compra usam só o consumo (Qtd Atendida) e o estoque do almoxarifado do CD.
- Referência real (FEV/ABR/AGO 2026, rede): 1,19 / 1,16 / 1,57 PA por sacola (regra 1,5); presente 14,8% / 31,1% (abastecimento do Dia das Mães) / 13,7% das vendas.
- Tela do Consumo Loja: todas as classes CSS com prefixo `acl-` e layout travado com `!important` (o CSS do Portal tem regras genéricas — botão 100%, cabeçalho em coluna — que encavalavam o cabeçalho e os botões). Ao criar telas novas dentro do Portal, sempre usar classes com prefixo próprio.
- Saídas (padrão diretoria, 07/11/2026): **Painel** com 6 indicadores que mostram a composição do número (clicar abre o detalhamento: lojas únicas fora do padrão e em quais itens, consumo por item, estoque e cobertura, previsão por mês, o que comprar), gráficos SVG (consumo mensal R$ por grupo, cobertura do estoque, lojas com maior excesso) e tabela única por item (estoque, consumo médio, tendência, cobertura, previsão 3 meses, comprar). Sem regras escritas nos cards. **Comparativo** enxuto: gráfico do índice mês a mês e tabela de lojas com o mix P/M/G em uma coluna. **Relatório Diretoria** (PDF/impressão): 4 cards, 2 gráficos, estoque e consumo por item mês a mês com total em R$, compra necessária e lojas acima do padrão. Excel com 7 abas.
