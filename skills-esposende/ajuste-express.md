# Ajuste Express
Regra imutável: somente inclusão positiva de estoque; nunca saída/redução.
Auditar quantidade, loja, CPF, item/referência+numeração, motivo, foto, horário, status, executor e valor de venda quando disponível.
Alertas: CPF em múltiplas lojas; pedidos simultâneos; ausência de foto; loja inválida; reincidência; erro/cancelamento; ajuste após inventário.
Robôs R31/R40: cada execução deve ser única, rastreável e sem duplicidade. In-flight incerto vai para revisão, nunca reexecução cega.
