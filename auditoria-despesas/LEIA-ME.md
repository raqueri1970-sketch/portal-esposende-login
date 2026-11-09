# Auditoria de Despesas e OS

Tela aberta pelo card **Auditoria de Despesas e OS** do Portal e pelo item do mesmo nome no menu **Auditoria**
(`auditoria-despesas-patch.js`). Duas abas:

- **Relatórios de despesas** — cada relatório de reembolso auditado cupom a cupom: retenções, duplicidades, combustível ×
  agenda das OS, custo de ida do CD a cada loja, médias e plano de redução.
- **Ordens de serviço** — carteira do Globalthings (abertas × fechadas): custo previsto por OS, alertas de controle,
  prestadores, equipe, preços de material, retrabalho e cruzamento com os relatórios de despesas.

Dados no Supabase (`aud_despesas_relatorios`, `aud_os_carteira`), com acesso só para administrador, controladoria e
diretoria. Entram pelo botão **Importar arquivo** (`.json` gerado na auditoria). Nenhum dado de auditoria fica neste
repositório (ver `.gitignore`). Ferramentas de geração ficam no repositório `sistema-de-auditoria` (`auditoria-despesas/ferramentas`).
