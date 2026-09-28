# Financeiro / Contas a Pagar
Fonte preferencial: API financeira autorizada via backend seguro; nunca expor Bearer Token no navegador, HTML ou repositório.
Auditar títulos pagos, abertos, vencidos, vencendo, fornecedores, documentos, datas e centros/lojas conforme campos reais da API.
Testes: possível duplicidade; mesmo documento; fornecedor+valor+data repetidos; atraso; variação anormal; concentração; pagamentos fracionados como anomalia; juros/multa; descontos/abatimentos; diferenças sem justificativa.
Observações: classificar texto em desconto por defeito, devolução, bonificação, desconto de fornecedor, juros, multa, abatimento e outros somente quando sustentado pelo texto. Cruzar valor original, valor pago e diferença. Nunca acusar fraude com base apenas em anomalia.
