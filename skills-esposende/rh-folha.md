# RH e Folha
Auditar folha, funcionário, cargo, loja e faixas autorizadas. Detectar valores fora de faixa e divergências entre cadastro e folha. Para perguntas de gerente por loja, consultar a base/buscador de RH. Tratar CPF e dados pessoais com acesso mínimo necessário.

## Faltas e Atrasos (módulo `faltas-atrasos/`)
- Carregamento reconhece cada planilha pelas colunas, não pelo nome: cartão de ponto (Código, Data, Falta/atraso), folha detalhada (Verba_Código, Verba_Quant, Verba_Valor) e base ATIVOS (Matrícula, Nome, Situação, C. custo). Só o ponto é obrigatório; arquivo não reconhecido aparece com o motivo.
- Falta = ocorrência ≥ 7h20 no dia; atraso = menor. Absenteísmo = horas perdidas ÷ (quadro ativo × dias úteis seg–sáb sem feriados nacionais × 7h20).
- DSR esperado = 1 dia da jornada (mín. 7h20; 9h para jornada de 9h) por semana seg–dom com falta de dia inteiro + 1 dia por feriado nacional seg–sáb da mesma semana (Lei 605/49).
- Conta corrente (fa-v5): DEVIDO pelo ponto (o que deveria ser descontado, não o que falta) − DESCONTADO na folha = DIFERENÇA, separada em falta/atraso e DSR.
  - Falta/atraso devido = horas do cartão − atrasos ≤ 10 min/dia. Diferença positiva = Descontar; negativa = Estornar ou comprovar.
  - DSR devido = faixa: mínimo = semanas (seg–dom) com falta encerradas até o fechamento do ponto; máximo = + semanas cujo domingo cai depois do fechamento (podem ir para a próxima folha). Folha dentro da faixa = correto; abaixo do mínimo = Descontar; acima do máximo = Conferir (folga/escala), nunca estorno automático.
  - Afastado/férias na base ATIVOS: devido zero e ação Conferir (confirmar início do afastamento).
  - Desconto de quem não está no cartão = Conferir (sem ocorrência no ponto).
  - R$ = diferença × valor-hora que a folha usou para a pessoa (sem desconto: salário; sem salário: média do estabelecimento, marcado como estimado).
  - Reconciliação na tela: Σ devido − Σ descontado = faltou − a mais − DSR a conferir − sem ponto (horas e R$).
  - Verificação: recálculo independente em Python bateu 25/25 colaboradores (ponto 21/09–20/10/2026).
- Cards: clicar em qualquer card (8 do topo + 5 da conta corrente) abre "De onde vem este número": fórmula com os números, fonte e data, lista item a item com Total igual ao card e exportação em Excel.
- Relatórios: Relatório da Diretoria (cards, conta corrente, lojas, principais divergências, conclusões), PDF conta corrente e Excel (ExcelJS) — todos com a logo oficial (`faltas-atrasos/logo-esposende.jpg`, mesma arte do LOGO_B64).
- Auditorias de desconto: sem desconto, menor, maior, sem ponto, atraso ≤ 10 min descontado (CLT 58 §1º), DSR ausente/maior/menor/só com atraso, valor-hora divergente. Gestão: afastado com falta, fora da base, nome divergente, duplicidade, 3+ faltas seguidas, reincidência, emenda, feriado.
