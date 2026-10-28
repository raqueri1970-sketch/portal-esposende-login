# Crediário de Funcionários

Objetivo: permitir ao Cérebro Executivo consultar, conferir e auditar o módulo de Crediário de Funcionários do Portal Esposende.

Fonte e regra principal: usar sempre a base operacional que alimenta o módulo de crediário. A tela, cards, cache, PDF, fotos e anexos servem apenas como apoio/evidência. Se a base operacional não estiver acessível, informar indisponibilidade e nunca inventar valores.

Escopo de consultas: compras de crediário por colaborador/CPF; quantidade e valor das parcelas; parcela devida por competência; valor herdado de compras anteriores; novas compras; projeção das próximas competências; total a descontar no mês; saldo em aberto; histórico por colaborador; ativos; inativos/desligados; PJ e pessoas fora da Base Mãe; relatório Diretoria; divergências entre valor devido e valor efetivamente descontado; rescisões com saldo de crediário.

Regra de cálculo: o valor devido em cada competência é acumulativo. Somar as parcelas vigentes de todas as compras que alcançam aquela competência, sem duplicar compra ou parcela. Separar claramente valor herdado de competências anteriores e parcelas originadas por compras novas. Informar competência e origem do cálculo.

Cadastro: cruzar CPF com a Base Mãe do Portal para classificar o comprador como colaborador ativo, inativo/desligado ou fora do cadastro/PJ. Não excluir compras apenas porque o CPF não está na Base Mãe. Fora do cadastro/PJ deve permanecer visível e alimentar o relatório da Diretoria.

Rescisões: para colaborador desligado com saldo aberto, verificar se o saldo foi tratado/descontado na rescisão. Sem evidência suficiente, classificar como pendência de conferência, nunca como quitação presumida.

Auditoria: comparar valor calculado com desconto/baixa comprovada. Classificar como OK, descontou a menos, descontou a mais, desconto sem compra, verificar por histórico incompleto, ou pendência de rescisão. Quando a base disponível contiver apenas carteira em aberto e não todas as compras já quitadas, excesso de desconto não deve virar erro automaticamente: classificar como VERIFICAR e solicitar/importar ciclos anteriores de COMPRA EM LOJA para confirmar.

Conferente: responder primeiro com o resultado objetivo e depois, quando necessário, detalhar colaborador, CPF mascarado quando apropriado, competência, compras, parcelas, valor calculado, valor descontado, diferença, classificação e evidência.

Perguntas que esta skill deve reconhecer incluem: quanto vai descontar na próxima folha; quanto determinado funcionário tem para descontar; quantas parcelas faltam; quem está fora do cadastro; quanto a Diretoria precisa tratar por fora; quais desligados têm saldo; quem teve desconto divergente; projeção de novembro/dezembro ou qualquer competência; conferir um CPF ou nome; auditar o crediário.

Integrações: usar rh-folha para cadastro/folha e situação funcional; cruzamentos para validações entre bases; auditor-mestre como orquestrador. Nunca transformar divergência em acusação. Distinguir fato confirmado, divergência, alerta e dado insuficiente.