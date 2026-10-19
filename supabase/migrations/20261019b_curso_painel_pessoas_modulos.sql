-- Painel do Protocolo de Curso: mesma lista de curso_painel_lojas + progresso de cada módulo por pessoa,
-- para a grade "uma linha por pessoa, uma coluna por módulo" (✓ aprovado ou % mais alto assistido).
-- modulos = {"<modulo_id>": {"p": % máximo assistido, "ok": aprovado válido, "nota": melhor nota aprovada}}
create or replace function public.curso_painel_pessoas(p_area_id text default 'estoque')
returns table(cpf_mask text, nome text, cargo text, grupo text, loja_codigo integer, loja_fonte text, origem text,
              aprovados text[], iniciados integer, ultimo_acesso timestamptz, certificado boolean, modulos jsonb)
language plpgsql stable security definer set search_path to 'public'
as $function$
begin
  if not public.portal_is_staff() then raise exception 'Acesso restrito ao administrador'; end if;
  return query
  with cat as (
    select c.id from public.curso_catalogo c where c.area_id=p_area_id and c.ativo
  ), v as (
    select regexp_replace(vv.cpf,'\D','','g') c, vv.modulo_id, vv.criado_em, vv.loja,
           coalesce(vv.percentual_assistido,0) pct, vv.nota_avaliacao,
           (vv.concluido and coalesce(vv.duracao_video_seg,0) > 0
             and coalesce(vv.segundos_assistidos,0) >= ceil(coalesce(vv.duracao_video_seg,0)*.90)
             and vv.criado_em <= now() - make_interval(secs => ceil(coalesce(vv.duracao_video_seg,0)*.80)::integer)
             and coalesce(vv.avaliacao_aprovada,false)) ok
    from public.curso_visualizacoes vv join cat on cat.id=vv.modulo_id
    where vv.cpf is not null
  ), pm as (
    select v.c, v.modulo_id, max(v.pct) pct, bool_or(v.ok) ok, max(v.nota_avaliacao) filter (where v.ok) nota
    from v group by v.c, v.modulo_id
  ), mj as (
    select pm.c, jsonb_object_agg(pm.modulo_id, jsonb_build_object('p', round(pm.pct), 'ok', pm.ok, 'nota', pm.nota)) mods
    from pm group by pm.c
  ), pv as (
    select v.c,
           array_agg(distinct v.modulo_id) filter (where v.ok) aprov,
           count(distinct v.modulo_id)::int ini,
           max(v.criado_em) ult,
           (regexp_match((array_agg(v.loja order by v.criado_em desc))[1], '^\s*0*(\d+)'))[1]::int loja_dig
    from v group by v.c
  ), grp as (
    select x.*, case when x.cg ilike '%subgerente%' then 'sub'
                     when x.cg ilike '%gerente de loja%' or x.cg ~* '^\s*gerente\s*$' then 'ger'
                     when x.cg ilike '%estoquista%' then 'est' else 'out' end g
    from (
      select f.cpf c, f.nome n, f.cargo cg, f.loja_codigo l, 'base'::text o from public.portal_funcionarios f where f.ativo
      union all
      select m.cpf, m.nome, m.cargo, m.loja_codigo, 'manual' from public.curso_cadastro_manual m
       where m.ativo and not exists (select 1 from public.portal_funcionarios f where f.cpf=m.cpf and f.ativo)
    ) x
  ), pessoas as (
    select g.c, g.n, g.cg, g.g, g.l, g.o from grp g where g.g <> 'out' or g.o='manual' or exists (select 1 from pv where pv.c=g.c)
    union all
    select pv.c, coalesce(a.nome,'(fora da base)'), coalesce(a.cargo,'—'), 'out', null::int, 'fora'
      from pv left join public.portal_acesso_permanente a on a.cpf=pv.c
     where not exists (select 1 from grp where grp.c=pv.c)
  )
  select '***.'||substr(p.c,4,3)||'.'||substr(p.c,7,3)||'-**', p.n, p.cg, p.g,
         coalesce(p.l, pv.loja_dig),
         case when p.l is not null then p.o else case when pv.loja_dig is not null then 'digitada' end end,
         p.o, coalesce(pv.aprov, '{}'::text[]), coalesce(pv.ini,0), pv.ult,
         exists(select 1 from public.curso_certificados cc where cc.cpf=p.c and cc.area_id=p_area_id and cc.revogado_em is null and cc.aceite_em is not null),
         coalesce(mj.mods, '{}'::jsonb)
  from pessoas p left join pv on pv.c=p.c left join mj on mj.c=p.c;
end;
$function$;

grant execute on function public.curso_painel_pessoas(text) to authenticated;
