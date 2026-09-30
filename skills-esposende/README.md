# Skills do Cérebro Esposende
Pacote operacional de auditoria do Portal Executivo. Estas skills orientam o Cérebro a localizar a fonte que alimenta cada módulo, validar evidências, cruzar módulos e responder com resultado primeiro.

Princípios: nunca inventar dado; informar período e fonte; distinguir fato, alerta e hipótese; preservar evidência; não alterar operação quando a tarefa for auditoria; usar o buscador do próprio módulo como fallback; normalizar lojas (0050/0950/950/50 = 50; 910 = 10; 920 = 20); priorizar velocidade sem sacrificar validação.

Orquestração: Auditor Mestre chama a skill especializada e, quando necessário, skills de cruzamento. Sentinela cuida de alertas. Toda exceção deve permitir rastrear registro, regra, fonte e período.

Skills: auditor-mestre, ajuste-express, inventario, saci, comercial, rh-folha, comissao, compras, financeiro, notas-fiscais, almoxarifado, cd-recebimento, transportadora, cruzamentos, treinamentos.
