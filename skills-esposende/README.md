# Skills do Cérebro Esposende
Pacote operacional de auditoria do Portal Executivo. Estas skills orientam o Cérebro a localizar a fonte que alimenta cada módulo, validar evidências, cruzar módulos e responder com resultado primeiro.

Princípios: nunca inventar dado; informar período e fonte; distinguir fato, alerta e hipótese; preservar evidência; não alterar operação quando a tarefa for auditoria; usar o buscador do próprio módulo como fallback; normalizar lojas (0050/0950/950/50 = 50; 910 = 10; 920 = 20); priorizar velocidade sem sacrificar validação.

Orquestração: Auditor Mestre chama a skill especializada e, quando necessário, skills de cruzamento. Sentinela cuida de alertas. Toda exceção deve permitir rastrear registro, regra, fonte e período.

Skills: auditor-mestre, ajuste-express, inventario, saci, comercial, rh-folha, crediario, comissao, compras, financeiro, notas-fiscais, almoxarifado, cd-recebimento, transportadora, cruzamentos, treinamentos.

## Regra de relatórios
Todo relatório gerado pelo Portal (impressão, PDF, Excel) sai com a logo oficial da Esposende no topo. Fonte da logo: LOGO_B64 em almox-consumo-item-patch.js (mesma arte de orcamento-compras.html).
Valores principais sempre em cards; tabelas com cabeçalho azul-marinho, linhas zebradas e total destacado; rodapé com "Esposende · Central de Auditoria & Controle" e data de geração. Modelo completo em almoxarifado.md (Padrão de relatório).

## Regra geral: cards inteligentes (todo módulo, sempre)
Definida pela Controladoria em 09/11/2026 — texto completo em `CLAUDE.md` na raiz do repositório. Resumo: título diz exatamente o que é o número; sempre a data da base; sempre comparação com cor; clicar mostra a composição (que soma o card); separar o que distorce (obra × operação, compra direta × estoque, CD × lojas); só contar o acionável; alertar base errada/incompleta; conferir na nuvem antes de publicar.
