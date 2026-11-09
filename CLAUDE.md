# Portal Esposende — regras do projeto

## Regra geral: cards inteligentes (vale para TODO módulo, sempre)
Decisão da Controladoria (09/11/2026). Qualquer card de indicador, novo ou alterado, em qualquer módulo do Portal, segue estas regras:

1. **O título diz exatamente o que é o número.** Ex.: "Estoque hoje", "Consumo de OUT/26", "O estoque dura", "Itens para repor". Nunca um rótulo genérico ("Almoxarifado", "Total geral") e nunca misturar no mesmo card coisas de natureza diferente (estoque × consumo × fornecedor).
2. **Sempre a data da base.** O card diz de quando é o número: "posição de 09/11/2026", "base até 06/11/2026", "mês em andamento". Número sem data não vai para a tela.
3. **Sempre com comparação e cor.** Contra a média e contra o período anterior, em %; vermelho = piorou / acima do esperado, verde = melhorou / dentro.
4. **Clicar mostra a composição.** Todo card abre o detalhe de onde vem o número (itens, lojas, setores, regionais) e a soma do detalhe bate com o card.
5. **Separar o que distorce.** Obra/investimento (Facilities) separado da operação; compra direta separada do que é estoque; CD/escritório separado das lojas; lojas fechadas marcadas.
6. **Só contar o que é acionável.** Ex.: "itens para repor" só conta item que existe no estoque e tem saída recorrente — não item de obra comprado uma vez.
7. **Alertar base errada ou incompleta, nunca mostrar número errado em silêncio.** Mês com poucas linhas, arquivo carregado no campo errado (ex.: TI no estoque), dado faltando → aviso visível no topo.
8. **Valor do card em R$ inteiro e legível**; centavos só no detalhe.
9. **Conferir antes de publicar.** Recalcular o número pela nuvem (SQL em `portal_sync`) ou pelo arquivo de origem e bater com o card.

## Outras regras
- Relatórios (impressão, PDF, Excel) sempre com a logo oficial da Esposende — ver `skills-esposende/README.md`.
- Telas novas dentro do Portal usam classes CSS com prefixo próprio (ex.: `acl-`, `apn-`), porque o CSS do Portal tem regras genéricas.
- Módulos ficam no arquivo do Portal guardado no Supabase Storage; alterações são feitas por patches `*-patch.js` injetados em `index.html` (com `?v=` novo a cada versão).
- Detalhes por módulo em `skills-esposende/<modulo>.md`.
