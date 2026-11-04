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
