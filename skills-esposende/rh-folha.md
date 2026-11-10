# RH e Folha
Auditar folha, funcionário, cargo, loja e faixas autorizadas. Detectar valores fora de faixa e divergências entre cadastro e folha. Para perguntas de gerente por loja, consultar a base/buscador de RH. Tratar CPF e dados pessoais com acesso mínimo necessário.

## Faltas e Atrasos (módulo `faltas-atrasos/`)
- Carregamento reconhece cada planilha pelas colunas, não pelo nome: cartão de ponto (Código, Data, Falta/atraso), folha detalhada (Verba_Código, Verba_Quant, Verba_Valor) e base ATIVOS (Matrícula, Nome, Situação, C. custo). Só o ponto é obrigatório; arquivo não reconhecido aparece com o motivo.
- Falta = ocorrência ≥ 7h20 no dia; atraso = menor. Absenteísmo = horas perdidas ÷ (quadro ativo × dias úteis seg–sáb sem feriados nacionais × 7h20).
- DSR esperado = 7h20 por semana com falta + 7h20 por feriado nacional seg–sáb da mesma semana (Lei 605/49).
- Auditorias de desconto: sem desconto, menor, maior, sem ponto, atraso ≤ 10 min descontado (CLT 58 §1º), DSR ausente/maior/menor/só com atraso, valor-hora divergente. Gestão: afastado com falta, fora da base, nome divergente, duplicidade, 3+ faltas seguidas, reincidência, emenda, feriado.
