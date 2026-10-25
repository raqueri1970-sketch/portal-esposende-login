-- 25/10/2026 (pedido do Ricardo): fundo fixo de R$ 10 mil por prestador.
-- A sobra de um PIX só vira adiantamento até completar os R$ 10 mil; o que passar disso é crédito do próprio PIX
-- e paga sozinho as próximas despesas que chegarem (ex.: Jhony 20/10, PIX R$ 7.993,00, despesas no sistema R$ 7.414,30;
-- os R$ 578,70 eram de comprovantes enviados depois do PIX e apareciam como adiantamento).
-- Projeto Supabase: "sistema de auditoria". JÁ APLICADA em 25/10/2026 (registro).
begin;

alter table public.obras_adiantamentos add column if not exists tipo text not null default 'fundo';
alter table public.obras_adiantamentos add column if not exists pagamento_id uuid references public.obras_pagamentos(id);
do $$ begin
  alter table public.obras_adiantamentos add constraint obras_adiantamentos_tipo_ck check (tipo in ('fundo', 'credito_pix', 'glosa'));
exception when duplicate_object then null; end $$;

create or replace function obras_interno.fundo_fixo(p_prest text) returns numeric language sql immutable as $$ select 10000::numeric $$;

-- Usa o crédito de PIX do prestador nas despesas em aberto (mais antigas primeiro), dentro do próprio pagamento do PIX
create or replace function obras_interno.aplicar_credito_pix(p_prest text) returns numeric
 language plpgsql security definer set search_path to 'public'
as $function$
declare a record; d record; v_resto numeric; v_parte numeric; v_usado numeric; v_total numeric := 0; v_ids uuid[];
begin
  for a in select * from public.obras_adiantamentos
            where prestador = p_prest and tipo = 'credito_pix' and not cancelado and valor > 0.004 and pagamento_id is not null
            order by data, created_at for update loop
    v_resto := a.valor; v_usado := 0; v_ids := '{}';
    for d in select id, saldo from public.obras_despesas_pagamento
              where prestador = p_prest and status = 'lancado' and saldo > 0.004
              order by wa_data nulls first, data_despesa nulls last, id loop
      exit when v_resto <= 0.004;
      v_parte := round(least(d.saldo, v_resto), 2);
      insert into public.obras_pagamento_itens (pagamento_id, comprovante_id, valor) values (a.pagamento_id, d.id, v_parte)
        on conflict (pagamento_id, comprovante_id) do update set valor = public.obras_pagamento_itens.valor + excluded.valor;
      v_ids := v_ids || d.id; v_usado := v_usado + v_parte; v_resto := v_resto - v_parte;
    end loop;
    continue when v_usado <= 0;
    update public.obras_pagamentos set valor_itens = valor_itens + v_usado, valor_aprovado = valor_aprovado + v_usado,
           valor_pago = valor_pago + v_usado, updated_at = now() where id = a.pagamento_id;
    -- usado todo: fica cancelado com o valor original (histórico); usado em parte: fica só o que sobrou
    update public.obras_adiantamentos set valor = case when v_resto <= 0.004 then valor else round(v_resto, 2) end,
           cancelado = (v_resto <= 0.004),
           observacao = left(coalesce(observacao, '') || ' | ' || to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM') ||
                        ': R$ ' || to_char(v_usado, 'FM999G999G990D00') || ' usados em ' || array_length(v_ids, 1) || ' despesa(s) que chegaram depois do PIX', 1000)
     where id = a.id;
    perform public.obras_atualizar_situacao(u.cid) from unnest(v_ids) as u(cid);
    perform public.obras_pag_evento(a.pagamento_id, null, p_prest, 'CREDITO_PIX', 'Crédito do PIX (automático)',
      jsonb_build_object('valor', v_usado, 'itens', array_length(v_ids, 1), 'sobra', round(greatest(v_resto, 0), 2)));
    v_total := v_total + v_usado;
  end loop;
  return v_total;
end $function$;

-- Despesa nova lançada: se o prestador tem crédito de PIX, ela é paga com ele na hora
create or replace function obras_interno.credito_pix_trigger() returns trigger
 language plpgsql security definer set search_path to 'public'
as $function$
declare r text;
begin
  if pg_trigger_depth() > 1 then return null; end if;
  for r in select distinct n.responsavel from novos n
            where n.responsavel is not null and n.status = 'lancado'
              and exists (select 1 from public.obras_adiantamentos a where a.prestador = n.responsavel and a.tipo = 'credito_pix' and not a.cancelado and a.valor > 0.004) loop
    begin perform obras_interno.aplicar_credito_pix(r);
    exception when others then raise warning 'obras credito pix %: %', r, sqlerrm; end;
  end loop;
  return null;
end $function$;

drop trigger if exists obras_credito_pix_ins_trg on public.obras_comprovantes;
drop trigger if exists obras_credito_pix_upd_trg on public.obras_comprovantes;
create trigger obras_credito_pix_ins_trg after insert on public.obras_comprovantes referencing new table as novos
  for each statement execute function obras_interno.credito_pix_trigger();
create trigger obras_credito_pix_upd_trg after update on public.obras_comprovantes referencing new table as novos
  for each statement execute function obras_interno.credito_pix_trigger();

-- PIX automático: a sobra completa o fundo de R$ 10 mil; o resto vira crédito do PIX
create or replace function public.obras_pix_paga_prestador(p_comp uuid)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare
  c public.obras_comprovantes; v_prest text; v public.obras_pagamentos; d record;
  v_resto numeric; v_parte numeric; v_tot numeric := 0; v_ids uuid[] := '{}'; v_quando timestamptz; v_sobra numeric;
  v_quem text := 'PIX Mar Aberto (automático)'; v_disp numeric; v_fundo numeric;
begin
  select * into c from public.obras_comprovantes where id = p_comp for update;
  if not found or c.status <> 'pagamento' or c.pagamento_id is not null or coalesce(c.valor, 0) <= 0 then return null; end if;
  select f.prestador into v_prest from public.obras_favorecido_prestador f
   where f.ativo and public.obras_norm_favorecido(c.fornecedor) like '%' || f.padrao || '%'
   order by length(f.padrao) desc limit 1;
  if v_prest is null then return null; end if;
  v_quando := coalesce(c.wa_data, c.created_at);
  v_resto := round(c.valor, 2);
  insert into public.obras_pagamentos (prestador, status, valor_itens, valor_abatido, valor_aprovado, aprovado_por, aprovado_em, observacao)
  values (v_prest, 'aprovado', 0.01, 0, 0, v_quem, v_quando,
          'PIX da Mar Aberto para ' || coalesce(c.fornecedor, v_prest) || ' — lançado sozinho como pagamento (sem descontar adiantamento)')
  returning * into v;
  for d in select id, saldo from public.obras_despesas_pagamento
            where prestador = v_prest and status = 'lancado' and saldo > 0.004
            order by wa_data nulls first, data_despesa nulls last, id loop
    exit when v_resto <= 0.004;
    v_parte := round(least(d.saldo, v_resto), 2);
    if v_parte <= 0 then exit; end if;
    insert into public.obras_pagamento_itens (pagamento_id, comprovante_id, valor) values (v.id, d.id, v_parte);
    v_ids := v_ids || d.id; v_tot := v_tot + v_parte; v_resto := v_resto - v_parte;
  end loop;
  -- quanto do fundo fixo já está com o prestador
  select greatest(coalesce(sum(a.valor) filter (where a.tipo <> 'credito_pix'), 0)
                  - coalesce((select sum(p.valor_abatido) from public.obras_pagamentos p where p.prestador = v_prest and p.status <> 'cancelado'), 0), 0)
    into v_disp from public.obras_adiantamentos a where a.prestador = v_prest and not a.cancelado;
  if v_tot <= 0 then
    delete from public.obras_pagamentos where id = v.id;
    insert into public.obras_adiantamentos (prestador, valor, data, observacao, comprovante_path, registrado_por, tipo)
    values (v_prest, round(c.valor, 2), (v_quando at time zone 'America/Sao_Paulo')::date,
            'PIX da Mar Aberto sem despesas em aberto — vira adiantamento', c.arquivo_path, v_quem, 'fundo');
    perform public.obras_pag_evento(null, c.id, v_prest, 'ADIANTAMENTO', v_quem, jsonb_build_object('valor', c.valor, 'origem', 'PIX Mar Aberto'));
    update public.obras_comprovantes set descricao = left('Adiantamento ao ' || v_prest || '. ' || coalesce(descricao, ''), 500), updated_at = now() where id = c.id;
    return null;
  end if;
  update public.obras_pagamentos set status = 'pago', valor_itens = v_tot, valor_aprovado = v_tot, valor_pago = v_tot,
         pago_por = v_quem, pago_em = v_quando, forma_pagamento = 'pix', comprovante_path = c.arquivo_path, favorecido = c.fornecedor, updated_at = now()
   where id = v.id returning * into v;
  update public.obras_comprovantes set pagamento_id = v.id, updated_at = now() where id = c.id;
  perform public.obras_atualizar_situacao(u.cid) from unnest(v_ids) as u(cid);
  perform public.obras_pag_evento(v.id, c.id, v_prest, 'PAGO', v_quem,
    jsonb_build_object('valor', v_tot, 'pix', c.valor, 'itens', array_length(v_ids, 1), 'origem', 'PIX Mar Aberto no WhatsApp', 'recebedor', c.fornecedor));
  v_sobra := round(c.valor - v_tot, 2);
  if v_sobra > 0.004 then
    v_fundo := least(v_sobra, greatest(obras_interno.fundo_fixo(v_prest) - v_disp, 0));
    if v_fundo > 0.004 then
      insert into public.obras_adiantamentos (prestador, valor, data, observacao, comprovante_path, registrado_por, tipo, pagamento_id)
      values (v_prest, v_fundo, (v_quando at time zone 'America/Sao_Paulo')::date,
              'Fundo fixo (sobra do PIX de R$ ' || to_char(c.valor, 'FM999G999G990D00') || ', pagamento nº ' || v.numero || ')', c.arquivo_path, v_quem, 'fundo', v.id);
      perform public.obras_pag_evento(v.id, c.id, v_prest, 'ADIANTAMENTO', v_quem, jsonb_build_object('valor', v_fundo, 'origem', 'sobra do PIX completa o fundo'));
    end if;
    if v_sobra - v_fundo > 0.004 then
      insert into public.obras_adiantamentos (prestador, valor, data, observacao, comprovante_path, registrado_por, tipo, pagamento_id)
      values (v_prest, round(v_sobra - v_fundo, 2), (v_quando at time zone 'America/Sao_Paulo')::date,
              'Crédito do PIX de R$ ' || to_char(c.valor, 'FM999G999G990D00') || ' (pagamento nº ' || v.numero || ' quitou R$ ' || to_char(v_tot, 'FM999G999G990D00') || '): paga as próximas despesas',
              c.arquivo_path, v_quem, 'credito_pix', v.id);
      perform public.obras_pag_evento(v.id, c.id, v_prest, 'CREDITO_PIX', v_quem, jsonb_build_object('valor', round(v_sobra - v_fundo, 2), 'origem', 'sobra do PIX acima do fundo'));
    end if;
  end if;
  begin perform public.obras_pos_auditar_pagamento(v.id); exception when others then raise warning 'pos auditoria pix: %', sqlerrm; end;
  return v.id;
end $function$;

-- Classifica o que já existe e usa os R$ 578,70 do Jhony nas despesas que chegaram depois do PIX nº 20
update public.obras_adiantamentos set tipo = 'glosa' where observacao ilike 'GLOSA%';
update public.obras_adiantamentos a set tipo = 'credito_pix', pagamento_id = p.id
  from public.obras_pagamentos p
 where a.prestador = 'Jhony' and a.observacao like 'Sobra do PIX%' and not a.cancelado and p.prestador = 'Jhony' and p.numero = 20;
select obras_interno.aplicar_credito_pix('Jhony');

commit;
