---
name: treinamentos-cursos
description: Central de Treinamento e Cursos da Esposende (pasta curso/ do Portal). Use sempre que o pedido envolver treinamentos, cursos, módulos, videoaulas, avaliações/perguntas, progresso de colaboradores, certificados, permissões de acesso por cargo/CPF, novas áreas (Comercial, RH, Logística...) ou a apostila de apoio (curso/apostila.html) — criar, alterar, publicar, auditar quem concluiu, ou gerar apostila a partir de vídeos.
---

# Central de Treinamento — Esposende

Portal estático (GitHub Pages, branch `main`) + Supabase (projeto `rdztzurfesnobfkazgpm`). Tudo que o colaborador faz passa por RPCs `curso_*`; a página nunca grava direto nas tabelas.

## Mapa dos arquivos (`curso/`)

| Arquivo | Papel |
|---|---|
| `index.html` | Central: identificação (loja, nome, CPF, cargo → `curso_identificar_funcionario`), capa de áreas, cards dos módulos, player com trava anti-avanço, avaliação, parabéns, emissão do certificado, painel do admin. `?area=estoque` abre direto a área. |
| `certificado.html` | Certificado A4 paisagem (frente + verso) por `?c=CODIGO`; `?demo=1` só para admin logado. Botão "📘 Apostila completa" para a área de estoque. |
| `validar.html` | Validação pública do certificado (QR Code). |
| `certificados.html` | Lista de quem concluiu / certificados (admin). |
| `permissoes.html` | Regras de acesso por cargo/CPF (admin). |
| `institucional.html` | Módulo "Bem-vindo à Esposende". |
| `apostila.html` + `apostila/` | Apostila de apoio (ver seção própria). |
| `capas/<modulo>.jpg` | Capas 16:9 dos cards (`CAPA_VERSAO` em index.html força recarga). |
| `cert/` | Arte da frente e assinatura da Auditoria. |

## Supabase

- **Vídeos:** bucket público `curso-videos`, arquivo `<modulo>-v3.mp4` (`VIDEOS_BASE` em index.html).
- **Tabelas:** `curso_areas` (id, nome, ordem, ativo, carga_horaria_min) · `curso_catalogo` (id do módulo, area_id, nome, descricao, ordem, duracao `mm:ss`, accent, video_path, capa_path, ativo, publico_lojas) · `curso_questoes` (modulo_id, enunciado, alternativas, resposta_correta, ativa) · `curso_visualizacoes` (cada sessão de vídeo: cpf, loja, segundos/percentual assistido, concluido, avaliação, nota, sugestão) · `curso_certificados` (codigo, cpf, área, carga, módulos, aceite, hash, revogado_em) · `curso_permissoes` / `curso_permissoes_cpf`.
- **RPCs usados pela página:** `curso_listar_catalogo`, `curso_areas_permitidas` / `curso_permissoes_publicas`, `curso_identificar_funcionario`, `curso_registrar_progresso`, `curso_obter_avaliacao`, `curso_corrigir_avaliacao`, `curso_registrar_feedback`, `curso_progresso(p_cpf,p_area_id)`, `curso_emitir_certificado_assinado`, `curso_certificado_dados`, `curso_validar_certificado`, `curso_admin_*`.
- `CURSOS_FALLBACK` em index.html replica o catálogo de estoque caso o RPC falhe — mantenha em sincronia ao mudar módulos.

## Regras de negócio (não quebrar)

- Módulo concluído = vídeo assistido até o fim **sem adiantar** (a página bloqueia seek e velocidade > 1x; só admin pode adiantar) **e** avaliação aprovada.
- Certificado só com todos os módulos da área concluídos + declaração aceita; emitido e assinado pela **Auditoria Interna**. Carga horária = soma das durações.
- Admin **só** com login real do Portal (sessão Supabase + `portal_is_admin`). Nunca reintroduzir `?admin=1` ou "veio do Portal".
- Identidade do colaborador fica em `localStorage['curso_identidade_v2']` e precisa de `validado:true`.
- Chave pública (`sb_publishable_…`) pode ficar no HTML; qualquer outra credencial, nunca.

## Apostila de apoio (`curso/apostila.html`)

- Conteúdo em `curso/apostila/conteudo.js` (`window.APOSTILA`) + prints em `curso/apostila/<modulo>/NN.jpg`. **Gerados** por `scripts/build.py` a partir de `scripts/roteiro.py` — edite o roteiro, não o JS.
- Liberação: capítulo do módulo quando `curso_progresso` marca `aprovado`; apostila completa quando todos aprovados (junto com o certificado); admin vê tudo. `?modulo=<id>` abre um capítulo.
- Botões: card concluído ("Apostila deste módulo"), tela de parabéns, painel de progresso e painel admin ("Apostila completa"), certificado. Áreas com apostila: `APOSTILA_AREAS` em index.html.
- Impressão: A4 retrato, capa sangrada (`@page:first`), passos/atenção/checklist sem quebra no meio.
- Pipeline completo (vídeo → transcrição → prints → destaques → página): **leia `references/apostila.md`** antes de criar a apostila de uma área nova ou refazer prints.

## Tarefas comuns

- **Novo módulo numa área:** subir `<id>-v3.mp4` no bucket; inserir em `curso_catalogo` (ordem, duracao exata do vídeo); capa em `capas/<id>.jpg`; perguntas em `curso_questoes`; atualizar `CURSOS_FALLBACK` se for estoque; acrescentar o capítulo em `roteiro.py` e regerar a apostila.
- **Nova área:** `curso_areas` + módulos + regras em `curso_permissoes`; a área já existe em `AREAS` (index.html) com a posição do recorte da capa; incluir o id em `APOSTILA_AREAS` quando houver apostila e ajustar `nomeTreinamento()` no certificado se o nome não for "Treinamento de <área>".
- **Quem concluiu / auditoria:** consultar `curso_visualizacoes` e `curso_certificados` via Supabase (somente leitura); `certificados.html` é a visão do admin. Reportar loja, nome, CPF mascarado, módulos, nota e data — nunca expor CPF completo em texto público.
- **Revogar certificado:** preencher `revogado_em` (a validação passa a mostrar REVOGADO); não apagar a linha.

## Validar antes de publicar

1. `node --check` nos `<script>` alterados (extraia os blocos inline).
2. Renderizar com Playwright (`/opt/pw-browsers`, `NODE_PATH=$(npm root -g)`), simulando identidade `validado:true` e mockando os RPCs com `page.route` (registre o catch-all do Supabase **antes** das rotas específicas — a última rota registrada tem prioridade). `scripts/shot.js` faz isso para a apostila e gera PDF.
3. Publicar = push na `main` (GitHub Pages). Confirmar com o usuário antes, porque vai direto para as lojas.
