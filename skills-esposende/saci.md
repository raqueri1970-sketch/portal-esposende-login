# SACI
Usar a base/buscador SACI para pares casados. Responder total por loja, marca e item quando suportado. Validar duplicidades e normalização da loja. Cruzar com inventário e ajuste quando a pergunta envolver recorrência ou estoque.

## Conta oficial — Saci na Rede (Controladoria, 17/11/2026)
- **Saci na Rede = Pé Direito + Pé Esquerdo + Enviados 2026** (abas do D1.xlsx) = pés reais que precisamos casar.
- **Casados é histórico e NÃO sai da conta**: a aba Casados traz PARES já resolvidos (10.217 pares = 20.434 pés).
- Total de saci recebido = Saci na Rede + pés casados; taxa de casamento = pés casados ÷ total recebido.
- Linha "Total" do rodapé de cada aba não entra. Enviados 2026: custo/venda unitários × Qtde; Direito/Esquerdo: venda = Pdv_Unitario × Qtd.
- Base 17/11/2026: 5.753 + 5.276 + 8.487 = 19.516 pés a casar. Patch: `saci-rede-patch.js` (nuvem: portal_sync `saci_rede`).
- Ranking por Regional e Ranking de Lojas: vêm da aba **Enviados 2026** (coluna Origem = loja), porque a "Loja Origem" de Direito/Esquerdo vem vazia. Regional = mapa de regionais carregado no módulo (REGIONAL.xlsx); loja sem regional aparece em "(Sem regional)" com aviso. Casados não tem loja → "—" nos cards de casados por loja.
