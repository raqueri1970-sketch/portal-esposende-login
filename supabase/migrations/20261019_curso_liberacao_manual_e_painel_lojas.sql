-- Treinamento: liberação manual de CPF (sem depender da planilha mãe do RH) e painel por loja.
--
-- 1) curso_cadastro_manual: CPF + nome + cargo + loja cadastrados pelo administrador no Protocolo de Curso.
--    Tabela própria, para a carga da Base Mãe (portal_funcionarios) nunca apagar a liberação.
--    Quem está na base do RH continua valendo a base; o cadastro manual só entra quando o CPF não está lá.
-- 2) curso_colaborador(cpf): ponto único de "quem é esse CPF" (base do RH primeiro, depois cadastro manual).
--    Identificação, regras de acesso, certificado e andamento do admin passam a usar essa função.
-- 3) curso_painel_lojas(area): uma linha por pessoa do público-alvo (gerente, subgerente, estoquista da base,
--    cadastros manuais e qualquer um que já assistiu), com loja, grupo e módulos aprovados — base do painel por loja.

create table if not exists public.curso_cadastro_manual (
  cpf text primary key check (cpf ~ '^\d{11}$'),
  nome text not null,
  cargo text not null,
  loja_codigo integer,
  ativo boolean not null default true,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.curso_cadastro_manual enable row level security;
revoke all on public.curso_cadastro_manual from anon, authenticated;

create or replace function public.curso_colaborador(p_cpf text)
returns table(cpf text, nome text, cargo text, loja_codigo integer, setor_id bigint, origem text)
language sql stable security definer set search_path to 'public'
as $$
  with v as (select regexp_replace(coalesce(p_cpf,''),'\D','','g') c)
  (select f.cpf, f.nome, f.cargo, f.loja_codigo, f.setor_id, 'base'::text
     from public.portal_funcionarios f, v where f.cpf = v.c and f.ativo limit 1)
  union all
  (select m.cpf, m.nome, m.cargo, m.loja_codigo, null::bigint, 'manual'::text
     from public.curso_cadastro_manual m, v
    where m.cpf = v.c and m.ativo
      and not exists (select 1 from public.portal_funcionarios f where f.cpf = v.c and f.ativo)
    limit 1)
$$;
revoke all on function public.curso_colaborador(text) from public, anon, authenticated;

-- Identificação do colaborador na Central (mesmo contrato de antes).
create or replace function public.curso_identificar_funcionario(p_cpf text)
returns table(cpf text, nome text, cargo text, loja_codigo integer)
language plpgsql security definer set search_path to 'public'
as $function$
declare v text := regexp_replace(coalesce(p_cpf,''),'\D','','g');
begin
  if public.portal_is_admin() and length(v) = 11 then
    insert into public.portal_acesso_permanente(cpf,nome,cargo,setor_id,user_id,motivo)
    select v, coalesce(f.nome, x.nome), coalesce(f.cargo, x.cargo, 'Administrador'), f.setor_id, auth.uid(), 'administrador (primeiro login no Treinamento)'
    from (select 1) d
    left join public.portal_funcionarios f on f.cpf = v
    left join public.ajuste_cadastro_extra x on x.cpf = v
    where coalesce(f.nome, x.nome) is not null
    on conflict on constraint portal_acesso_permanente_pkey do nothing;
  end if;
  return query select c.cpf, c.nome, c.cargo, c.loja_codigo from public.curso_colaborador(v) c limit 1;
  if found then return; end if;
  return query select a.cpf, a.nome, a.cargo, null::integer from public.portal_acesso_permanente a where a.cpf = v limit 1;
end $function$;

-- Regras de acesso: o cargo do cadastro manual vale igual ao da base (gerente/sub liberados, estoquista pela regra).
create or replace function public.curso_areas_permitidas_regra(p_cpf text)
returns table(area_id text, permitido boolean, motivo text)
language sql stable security definer set search_path to 'public'
as $function$
with adm as (
  select public.portal_is_admin() ok
),
f as (
  select lower(coalesce(pf.cargo,'')) cargo,
         lower(coalesce(s.nome,'')) setor
  from public.curso_colaborador(p_cpf) pf
  left join public.portal_setores s on s.id=pf.setor_id
  limit 1
),
a as (
  select id from public.curso_areas where ativo=true
),
x as (
  select c.area_id,c.permitido
  from public.curso_permissoes_cpf c
  where c.cpf=regexp_replace(coalesce(p_cpf,''),'[^0-9]','','g')
)
select a.id,
  case
    when (select ok from adm) then true
    else coalesce(
      x.permitido,
      case
        when exists(select 1 from f where cargo like '%gerente%' or cargo like '%subgerente%') then true
        when exists(
          select 1
          from f
          join public.curso_permissoes p
            on p.area_id=a.id and p.ativo
          where (p.tipo='cargo' and f.cargo like '%'||lower(p.regra)||'%')
             or (p.tipo='setor' and f.setor like '%'||lower(p.regra)||'%')
        ) then true
        else false
      end
    )
  end as permitido,
  case
    when (select ok from adm) then 'administrador'
    when x.area_id is not null then 'cpf'
    when exists(select 1 from f where cargo like '%gerente%' or cargo like '%subgerente%') then 'gestao'
    when exists(
      select 1
      from f
      join public.curso_permissoes p
        on p.area_id=a.id and p.ativo
      where (p.tipo='cargo' and f.cargo like '%'||lower(p.regra)||'%')
         or (p.tipo='setor' and f.setor like '%'||lower(p.regra)||'%')
    ) then 'cargo_setor'
    else 'bloqueado'
  end as motivo
from a
left join x on x.area_id=a.id
$function$;

-- Certificado: aceita quem foi liberado manualmente (só muda a busca do colaborador).
create or replace function public.curso_emitir_certificado_assinado(p_cpf text, p_area_id text, p_assinatura text, p_aceite boolean, p_aceite_texto text, p_user_agent text default null::text, p_loja text default null::text)
returns text
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_nome text; v_cargo text; v_loja integer; v_area_nome text;
  v_total int; v_ok int; v_carga int; v_codigo text; v_existente text;
  v_mod jsonb; v_ip text; v_agora timestamptz := now(); v_hash text;
begin
  if coalesce(p_aceite,false) is not true then raise exception 'É preciso confirmar a declaração'; end if;
  if p_assinatura is not null and (p_assinatura !~ '^data:image/png;base64,' or length(p_assinatura) > 400000) then
    raise exception 'Assinatura inválida';
  end if;

  select f.nome, f.cargo, f.loja_codigo into v_nome, v_cargo, v_loja
  from public.curso_colaborador(v_cpf) f limit 1;
  if v_nome is null then raise exception 'CPF não localizado na base de colaboradores'; end if;

  select a.nome, a.carga_horaria_min into v_area_nome, v_carga from public.curso_areas a where a.id = p_area_id and a.ativo;
  if v_area_nome is null then raise exception 'Área de treinamento inválida'; end if;

  select cc.codigo into v_existente from public.curso_certificados cc
   where cc.cpf = v_cpf and cc.area_id = p_area_id and cc.revogado_em is null and cc.aceite_em is not null;
  if v_existente is not null then return v_existente; end if;

  select count(*), count(*) filter (where p.aprovado),
         jsonb_agg(jsonb_build_object('id',p.modulo_id,'nome',p.modulo_nome,'ordem',p.ordem,'duracao',p.duracao,
                   'nota',p.nota,'percentual',p.percentual,'concluido_em',p.concluido_em) order by p.ordem)
    into v_total, v_ok, v_mod
  from public.curso_progresso(v_cpf, p_area_id) p;
  if v_total = 0 or v_ok <> v_total then raise exception 'Treinamento ainda não foi concluído (% de % módulos)', v_ok, v_total; end if;

  if v_carga is null then
    select ceil(sum(public.curso_duracao_seg(c.duracao)) / 60.0)::int into v_carga
    from public.curso_catalogo c where c.area_id = p_area_id and c.ativo;
  end if;

  begin
    v_ip := split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for',
                                current_setting('request.headers', true)::json->>'cf-connecting-ip',''), ',', 1);
  exception when others then v_ip := null; end;

  v_codigo := 'ESP-' || to_char(v_agora,'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  v_hash := encode(extensions.digest(concat_ws('|', v_codigo, v_cpf, v_nome, p_area_id, v_carga, v_mod::text, coalesce(p_assinatura,''), v_agora::text, p_aceite_texto), 'sha256'), 'hex');

  insert into public.curso_certificados(codigo,cpf,nome_colaborador,cargo,loja_codigo,area_id,area_nome,carga_horaria_minutos,emitido_em,emitido_por,
       assinatura_png,aceite_texto,aceite_em,ip,user_agent,hash_sha256,modulos,loja_informada,revogado_em)
  values(v_codigo,v_cpf,v_nome,v_cargo,v_loja,p_area_id,v_area_nome,greatest(v_carga,1),v_agora,'Auditoria Interna Esposende',
       p_assinatura,p_aceite_texto,v_agora,nullif(trim(v_ip),''),left(p_user_agent,400),v_hash,v_mod,left(p_loja,120),null)
  on conflict (cpf,area_id) do update set
       codigo=excluded.codigo, nome_colaborador=excluded.nome_colaborador, cargo=excluded.cargo, loja_codigo=excluded.loja_codigo,
       area_nome=excluded.area_nome, carga_horaria_minutos=excluded.carga_horaria_minutos, emitido_em=excluded.emitido_em,
       emitido_por=excluded.emitido_por, assinatura_png=excluded.assinatura_png, aceite_texto=excluded.aceite_texto,
       aceite_em=excluded.aceite_em, ip=excluded.ip, user_agent=excluded.user_agent, hash_sha256=excluded.hash_sha256,
       modulos=excluded.modulos, loja_informada=excluded.loja_informada, revogado_em=null;
  return v_codigo;
end;
$function$;

-- Andamento do admin: inclui quem foi liberado manualmente.
create or replace function public.curso_admin_andamento(p_area_id text default 'estoque'::text)
returns table(cpf text, nome text, cargo text, loja_codigo integer, loja_informada text, concluidos integer, total integer, ultimo_acesso timestamp with time zone, certificado text, emitido_em timestamp with time zone)
language plpgsql stable security definer set search_path to 'public'
as $function$
begin
  if not public.portal_is_staff() then raise exception 'Acesso restrito ao administrador'; end if;
  return query
  with pessoas as (
    select regexp_replace(v.cpf,'\D','','g') c, max(v.criado_em) ult, (array_agg(v.loja order by v.criado_em desc))[1] loja
    from public.curso_visualizacoes v join public.curso_catalogo k on k.id=v.modulo_id and k.area_id=p_area_id
    where v.cpf is not null group by 1
  )
  select p.c, f.nome, f.cargo, f.loja_codigo, p.loja,
         (select count(*)::int from public.curso_progresso(p.c,p_area_id) x where x.aprovado),
         (select count(*)::int from public.curso_catalogo k where k.area_id=p_area_id and k.ativo),
         p.ult, cc.codigo, cc.emitido_em
  from pessoas p
  cross join lateral public.curso_colaborador(p.c) f
  left join public.curso_certificados cc on cc.cpf=p.c and cc.area_id=p_area_id and cc.revogado_em is null and cc.aceite_em is not null
  order by cc.emitido_em desc nulls last, p.ult desc;
end;
$function$;

-- ===================== Liberação manual (admin) =====================
create or replace function public.curso_admin_liberar_cpf(p_cpf text, p_nome text, p_cargo text, p_loja integer, p_areas text[] default array['estoque'])
returns jsonb
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v text := regexp_replace(coalesce(p_cpf,''),'\D','','g');
  v_base record;
begin
  if not public.portal_is_admin() then raise exception 'Apenas administrador do Portal pode liberar CPF'; end if;
  if length(v) <> 11 or replace(v, left(v,1), '') = '' then raise exception 'CPF inválido'; end if;
  if length(trim(coalesce(p_nome,''))) < 3 then raise exception 'Informe o nome completo'; end if;
  if length(trim(coalesce(p_cargo,''))) < 3 then raise exception 'Informe o cargo'; end if;
  if p_loja is not null and not exists (select 1 from public.portal_lojas l where l.codigo = p_loja) then
    raise exception 'Loja % não cadastrada no Portal', p_loja;
  end if;

  insert into public.curso_cadastro_manual(cpf,nome,cargo,loja_codigo,ativo,criado_por,criado_em,atualizado_em)
  values (v, upper(trim(p_nome)), trim(p_cargo), p_loja, true, auth.uid(), now(), now())
  on conflict (cpf) do update set nome=excluded.nome, cargo=excluded.cargo, loja_codigo=excluded.loja_codigo,
       ativo=true, atualizado_em=now();

  -- Garante a área mesmo para cargos fora da regra (ex.: vendedor que vai cobrir o estoque).
  insert into public.curso_permissoes_cpf(cpf,area_id,permitido,atualizado_em)
  select v, a.id, true, now() from public.curso_areas a where a.ativo and a.id = any(coalesce(p_areas, array['estoque']))
  on conflict (cpf, area_id) do update set permitido=true, atualizado_em=now();

  select f.nome, f.cargo, f.loja_codigo into v_base from public.portal_funcionarios f where f.cpf=v and f.ativo limit 1;
  return jsonb_build_object('cpf', v, 'na_base_rh', v_base.nome is not null,
    'aviso', case when v_base.nome is not null then 'CPF já está na base do RH ('||v_base.cargo||coalesce(' · loja '||v_base.loja_codigo,'')||'); a base continua valendo.' end);
end;
$function$;

create or replace function public.curso_admin_remover_liberacao(p_cpf text)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare v text := regexp_replace(coalesce(p_cpf,''),'\D','','g');
begin
  if not public.portal_is_admin() then raise exception 'Apenas administrador do Portal'; end if;
  update public.curso_cadastro_manual set ativo=false, atualizado_em=now() where cpf=v;
  -- Desativa em vez de apagar: guarda o histórico; sem cadastro ativo o CPF já não passa da identificação.
  update public.curso_permissoes_cpf set permitido=false, atualizado_em=now() where cpf=v
    and not exists (select 1 from public.portal_funcionarios f where f.cpf=v and f.ativo);
end;
$function$;

create or replace function public.curso_admin_liberacoes()
returns table(cpf text, nome text, cargo text, loja_codigo integer, criado_em timestamptz, na_base_rh boolean)
language sql stable security definer set search_path to 'public'
as $$
  select m.cpf, m.nome, m.cargo, m.loja_codigo, m.criado_em,
         exists(select 1 from public.portal_funcionarios f where f.cpf=m.cpf and f.ativo)
  from public.curso_cadastro_manual m
  where public.portal_is_staff() and m.ativo
  order by m.criado_em desc
$$;

-- ===================== Painel por loja (admin) =====================
-- Grupo: ger / sub / est (público-alvo) ou out (outros que assistiram ou foram liberados).
-- Loja: a da base do RH; senão a do cadastro manual; senão a última loja digitada na Central.
create or replace function public.curso_painel_lojas(p_area_id text default 'estoque')
returns table(cpf_mask text, nome text, cargo text, grupo text, loja_codigo integer, loja_fonte text, origem text,
              aprovados text[], iniciados integer, ultimo_acesso timestamptz, certificado boolean)
language plpgsql stable security definer set search_path to 'public'
as $function$
begin
  if not public.portal_is_staff() then raise exception 'Acesso restrito ao administrador'; end if;
  return query
  with cat as (
    select c.id from public.curso_catalogo c where c.area_id=p_area_id and c.ativo
  ), v as (
    select regexp_replace(vv.cpf,'\D','','g') c, vv.modulo_id, vv.criado_em, vv.loja,
           (vv.concluido and coalesce(vv.duracao_video_seg,0) > 0
             and coalesce(vv.segundos_assistidos,0) >= ceil(coalesce(vv.duracao_video_seg,0)*.90)
             and vv.criado_em <= now() - make_interval(secs => ceil(coalesce(vv.duracao_video_seg,0)*.80)::integer)
             and coalesce(vv.avaliacao_aprovada,false)) ok
    from public.curso_visualizacoes vv join cat on cat.id=vv.modulo_id
    where vv.cpf is not null
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
         exists(select 1 from public.curso_certificados cc where cc.cpf=p.c and cc.area_id=p_area_id and cc.revogado_em is null and cc.aceite_em is not null)
  from pessoas p left join pv on pv.c=p.c;
end;
$function$;

grant execute on function public.curso_admin_liberar_cpf(text,text,text,integer,text[]) to authenticated;
grant execute on function public.curso_admin_remover_liberacao(text) to authenticated;
grant execute on function public.curso_admin_liberacoes() to authenticated;
grant execute on function public.curso_painel_lojas(text) to authenticated;
