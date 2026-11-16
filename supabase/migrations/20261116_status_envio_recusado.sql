-- Aviso de envio RECUSADO no topo dos módulos + versões antigas do NF-e (para a tela abrir sempre com a nuvem).
--
-- Caso (16/11/2026 09:46): o navegador do Roberto reenviou sozinho o arquivo antigo do NF-e
-- (CANCELADA JUN - SET, 721 notas). A trava (20261105_nf_trava_sync.sql) recusou e manteve as
-- 1.818 notas de 05/11, mas o selo do topo mostrava "último envio ... — sem mudança nos dados",
-- e a tela de quem tinha os arquivos antigos guardados continuava mostrando a versão velha.
--
-- 1) portal_status_atualizacoes() passa a devolver também o último envio recusado de cada módulo
--    (quando, motivo, quem, quantas notas vieram e quantas a nuvem manteve).
-- 2) portal_nf_versoes_antigas(): assinatura (quantidade de notas + soma) de cada versão que já
--    saiu da nuvem ou foi recusada. O Portal compara com o que está na tela do NF-e e, se for uma
--    dessas, troca pela versão da nuvem.

drop function if exists public.portal_status_atualizacoes();
create function public.portal_status_atualizacoes()
returns table(module_id text, dados_em timestamptz, ultimo_envio timestamptz, usuario text,
              recusado_em timestamptz, recusado_motivo text, recusado_usuario text,
              recusado_n integer, recusado_n_atual integer)
language sql
stable
security definer
set search_path to ''
as $$
  select s.module_id, s.updated_at, e.ultimo_envio, e.usuario,
         b.criado_em, b.motivo, b.usuario, b.n_novo, b.n_atual
    from public.portal_sync s
    left join public.portal_sync_envios e on e.tenant_id = s.tenant_id and e.module_id = s.module_id
    left join lateral (
      select x.criado_em, x.motivo, x.usuario, x.n_novo, x.n_atual
        from public.portal_sync_bloqueios x
       where x.module_id = s.module_id
         and coalesce(x.tenant_id, s.tenant_id) = s.tenant_id
       order by x.id desc
       limit 1) b on true
   where (select public.portal_is_staff())
$$;
revoke all on function public.portal_status_atualizacoes() from public, anon;
grant execute on function public.portal_status_atualizacoes() to authenticated;

create or replace function public.portal_nf_versoes_antigas()
returns table(n integer, soma numeric, origem text, em timestamptz)
language sql
stable
security definer
set search_path to ''
as $$
  with atual as (
    select jsonb_array_length(s.payload->'registros') n,
           round(coalesce((select sum(case when (r->>'total') ~ '^-?[0-9.]+$' then (r->>'total')::numeric else 0 end)
                             from jsonb_array_elements(s.payload->'registros') r),0),2) soma
      from public.portal_sync s
     where s.module_id = 'nf' and jsonb_typeof(s.payload->'registros') = 'array'
     limit 1
  ), antigas as (
    select jsonb_array_length(h.payload->'registros') n,
           round(coalesce((select sum(case when (r->>'total') ~ '^-?[0-9.]+$' then (r->>'total')::numeric else 0 end)
                             from jsonb_array_elements(h.payload->'registros') r),0),2) soma,
           'historico'::text origem, h.updated_at em
      from public.portal_sync_historico h
     where h.module_id = 'nf' and jsonb_typeof(h.payload->'registros') = 'array'
    union all
    select b.n_novo, round(coalesce(b.soma_nova,0),2), 'recusado', b.criado_em
      from public.portal_sync_bloqueios b
     where b.module_id = 'nf' and b.n_novo is not null
  )
  select distinct on (a.n, a.soma) a.n, a.soma, a.origem, a.em
    from antigas a
   where (select public.portal_is_staff())
     and not exists (select 1 from atual t where t.n = a.n and t.soma = a.soma)
   order by a.n, a.soma, a.em desc
$$;
revoke all on function public.portal_nf_versoes_antigas() from public, anon;
grant execute on function public.portal_nf_versoes_antigas() to authenticated;
