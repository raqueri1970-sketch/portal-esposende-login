-- 2026-10-03: corrige pedidos do WhatsApp ja gravados em que a NUMERACAO do calcado
-- foi lida como QUANTIDADE (ex.: "Tam 39" => 39 pares). Todos os casos de 10 a 50 conferidos
-- no texto da mensagem eram numeracao. Vira 1 par; o valor lido fica no erro_executor e na auditoria.
-- O guard (ajuste concluido e imutavel) e desligado SO nesta transacao, so para estas linhas.
alter table public.ajuste_estoque_entrada disable trigger trg_guard_ajuste_estoque_entrada;

with alvo as (
  select id, quantidade as qtd_lida from public.ajuste_estoque_entrada
   where origem = 'WHATSAPP' and wa_chat <> 'importado:seta' and quantidade between 10 and 50),
upd as (
  update public.ajuste_estoque_entrada a
     set quantidade = 1,
         erro_executor = left(coalesce(a.erro_executor,'') || ' | QTD LIDA ' || alvo.qtd_lida || ' ERA NUMERACAO -> 1 PAR (corrigido 2026-10-03)', 1000),
         atualizado_em = now()
    from alvo where a.id = alvo.id
  returning a.id, a.user_id, alvo.qtd_lida)
insert into public.ajuste_estoque_auditoria(ajuste_id, user_id, origem, evento, detalhe)
select id, user_id, 'SISTEMA', 'CORRECAO_QUANTIDADE',
       jsonb_build_object('quantidade_anterior', qtd_lida, 'quantidade_nova', 1, 'motivo', 'numeracao do calcado lida como quantidade pelo leitor do WhatsApp')
  from upd;

alter table public.ajuste_estoque_entrada enable trigger trg_guard_ajuste_estoque_entrada;
