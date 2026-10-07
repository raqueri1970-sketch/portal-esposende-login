-- Cupom do WhatsApp com varios produtos passa a comprovar todos os pedidos da conversa cujo codigo CONFERE no cupom.
-- Antes: leitor_comprovante ligava a foto a UM pedido so; os outros do mesmo cupom ficavam "SEM FOTO".
-- Regra de auditoria: um cupom comprova cada codigo de produto uma vez so (nao confirma 2 pedidos do mesmo codigo).
-- Aplicada no Supabase em 2026-10-07; acerto retroativo ligou 41 pedidos (log: ajuste_seguranca_log evento FOTO_CUPOM_COMPARTILHADO).

create or replace function private.wa_ligar_cupom_compartilhado(p_foto bigint)
returns integer language plpgsql security definer set search_path to '' as $$
declare f record; c record; v_usados text[]; n integer := 0;
begin
  select * into f from public.ajuste_wa_fotos where id = p_foto;
  if f.id is null or coalesce(f.digitos,'') = '' then return 0; end if;
  select coalesce(array_agg(distinct a.codigo_produto), '{}') into v_usados
    from public.ajuste_estoque_entrada a where a.id = f.ajuste_id or a.comprovante_path = 'wa:' || f.id;
  for c in select a.id, a.codigo_produto from public.ajuste_estoque_entrada a
            where a.origem = 'WHATSAPP' and a.wa_chat = f.chat_id and a.status <> 'CANCELADO'
              and a.comprovante_path is null and not a.comprovado and a.venda_status = 'AGUARDANDO_VENDA'
              and a.criado_em <= f.recebido_em + interval '10 minutes' and a.criado_em >= f.recebido_em - interval '48 hours'
            order by a.criado_em loop
    if c.codigo_produto = any(v_usados) then continue; end if;
    if private.wa_conferir_codigo(f.digitos, c.codigo_produto) <> 'CONFERE' then continue; end if;
    update public.ajuste_estoque_entrada set comprovante_path = 'wa:' || f.id, comprovante_nome = 'foto do WhatsApp (cupom com varios itens)',
           comprovado = true, foto_codigo_status = 'CONFERE', foto_codigo_texto = left(f.digitos,500), foto_codigo_origem = 'LEITOR_CUPOM',
           foto_codigo_conferido_em = now(), venda_status = 'VENDA_CONFIRMADA', venda_confirmada_em = f.recebido_em, atualizado_em = now()
     where id = c.id and comprovante_path is null;
    if found then
      v_usados := v_usados || c.codigo_produto; n := n + 1;
      insert into public.ajuste_seguranca_log(evento, detalhe) values ('FOTO_CUPOM_COMPARTILHADO', 'ajuste=' || c.id || ' foto=' || f.id || ' foto_era_do=' || coalesce(f.ajuste_id::text,'-'));
    end if;
  end loop;
  return n;
end $$;
revoke all on function private.wa_ligar_cupom_compartilhado(bigint) from public, anon, authenticated;

-- leitor_comprovante: depois de ligar a foto ao pedido principal, liga aos demais pedidos do mesmo cupom.
do $$
declare d text;
begin
  select pg_get_functiondef('public.leitor_comprovante(text,text,text,text,text,timestamptz,text,text,text)'::regprocedure) into d;
  if position('wa_ligar_cupom_compartilhado' in d) = 0 then
    d := replace(d,
      E'  return jsonb_build_object(''resultado'', case when v_prim then ''LIGADA'' else ''EXTRA'' end, ''ajuste_id'', v_alvo, ''codigo'', v_st);',
      E'  perform private.wa_ligar_cupom_compartilhado(v_foto);\n  return jsonb_build_object(''resultado'', case when v_prim then ''LIGADA'' else ''EXTRA'' end, ''ajuste_id'', v_alvo, ''codigo'', v_st);');
    if position('wa_ligar_cupom_compartilhado' in d) = 0 then raise exception 'ponto de insercao nao encontrado em leitor_comprovante'; end if;
    execute d;
  end if;
end $$;

-- Acerto retroativo: fotos ja recebidas, em ordem de chegada.
do $$
declare f record;
begin
  for f in select id from public.ajuste_wa_fotos where ajuste_id is not null order by recebido_em, id loop
    perform private.wa_ligar_cupom_compartilhado(f.id);
  end loop;
end $$;
