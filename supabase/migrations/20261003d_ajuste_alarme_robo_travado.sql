-- 2026-10-03: alarme de ROBO TRAVADO.
--
-- Problema: o robo Sangue Azul continua mandando sinal de vida mesmo quando o Seta trava
-- (ex.: 03/10 15h38-16h46, 28/09 15h30-17h44, 26/09 11h25-12h37). O painel mostrava "online",
-- o link seguia aceitando pedido e ninguem era avisado; lojas desistiam e cancelavam.
--
-- Regra (calibrada no historico de 8 dias, nao dispara em dia de fila cheia):
--   TRAVADO = existe pedido do link esperando ha 10 min ou mais
--             E nenhum pedido terminou (concluido/erro) nos ultimos 10 min.
-- Enquanto travado:
--   * ajuste_robo_status() devolve online=false -> o link pausa sozinho e manda a loja pro WhatsApp
--     (mesma mensagem de "Sistema em manutencao" que ja existe);
--   * o painel mostra "Sangue Azul · TRAVADO" em vermelho;
--   * a cada minuto o banco grava no historico (private.ajuste_robo_alarmes) quando travou e quando voltou.
-- Destrava sozinho assim que o robo concluir um pedido.

create index if not exists ajuste_estoque_auditoria_criado_idx on public.ajuste_estoque_auditoria (criado_em);

create or replace function private.ajuste_robo_travado()
returns jsonb language sql stable security definer set search_path to '' as $$
  with abertos as (
    select criado_em from public.ajuste_estoque_entrada
     where origem = 'LINK' and status in ('PENDENTE','EM_EXECUCAO')),
  esperando as (select count(*) n, min(criado_em) desde from abertos where criado_em <= now() - interval '10 minutes'),
  ult as (
    select greatest(
      (select max(executado_em) from public.ajuste_estoque_entrada
        where origem = 'LINK' and status = 'CONCLUIDO' and executado_em > now() - interval '1 day'),
      (select max(criado_em) from public.ajuste_estoque_auditoria
        where criado_em > now() - interval '1 day' and origem = 'EXECUTOR'
          and detalhe->>'status_novo' in ('CONCLUIDO','ERRO','BLOQUEADO_DIVERGENCIA'))) t)
  select jsonb_build_object(
    'travado', e.n > 0 and (u.t is null or u.t < now() - interval '10 minutes'),
    'esperando', e.n,
    'fila', (select count(*) from abertos),
    'parado_desde', case when e.n > 0 then greatest(e.desde, u.t) end,
    'ultimo_concluido', u.t)
  from esperando e, ult u
$$;

-- link e painel: robo "online" so se tem sinal E nao esta travado
CREATE OR REPLACE FUNCTION public.ajuste_robo_status()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with t as (select private.ajuste_robo_travado() j)
  select jsonb_build_object(
    'online', exists(select 1 from private.executor_devices d
                     where d.ativo and d.heartbeat_em > now() - interval '2 minutes'
                       and d.status in ('OCIOSO','EXECUTANDO'))
              and not coalesce((t.j->>'travado')::boolean, false),
    'travado', coalesce((t.j->>'travado')::boolean, false),
    'fila', (select count(*) from public.ajuste_estoque_entrada where status in ('PENDENTE','EM_EXECUCAO')))
  from t
$function$;

-- historico do alarme
create table if not exists private.ajuste_robo_alarmes (
  id bigserial primary key,
  tipo text not null check (tipo in ('TRAVOU','VOLTOU')),
  em timestamptz not null default now(),
  parado_desde timestamptz,
  esperando integer,
  fila integer,
  minutos_parado integer
);

create or replace function private.ajuste_vigiar_robo()
returns void language plpgsql security definer set search_path to '' as $$
declare j jsonb := private.ajuste_robo_travado(); v_trav boolean := (j->>'travado')::boolean;
  v_ult text := (select tipo from private.ajuste_robo_alarmes order by em desc limit 1);
  v_ini timestamptz;
begin
  if v_trav and v_ult is distinct from 'TRAVOU' then
    insert into private.ajuste_robo_alarmes(tipo, parado_desde, esperando, fila)
    values ('TRAVOU', (j->>'parado_desde')::timestamptz, (j->>'esperando')::int, (j->>'fila')::int);
  elsif not v_trav and v_ult = 'TRAVOU' then
    select parado_desde into v_ini from private.ajuste_robo_alarmes where tipo = 'TRAVOU' order by em desc limit 1;
    insert into private.ajuste_robo_alarmes(tipo, parado_desde, esperando, fila, minutos_parado)
    values ('VOLTOU', v_ini, (j->>'esperando')::int, (j->>'fila')::int, round(extract(epoch from (now() - v_ini)) / 60));
  end if;
end $$;

select cron.schedule('ajuste_vigiar_robo', '* * * * *', 'select private.ajuste_vigiar_robo()');

-- painel: junta o estado de travamento no bloco "robo" e o historico de hoje
do $mig$
declare d text;
begin
  d := pg_get_functiondef('public.ajuste_painel(text)'::regprocedure);
  d := replace(d, '  r := public.ajuste_painel_base(p_token);',
'  r := public.ajuste_painel_base(p_token);
  -- 2026-10-03: alarme de robo travado (tem sinal, mas nenhum pedido sai)
  r := jsonb_set(r, ''{robo}'', coalesce(r->''robo'',''{}''::jsonb) || private.ajuste_robo_travado() || jsonb_build_object(''alarmes_hoje'',
         (select coalesce(jsonb_agg(jsonb_build_object(''tipo'', tipo, ''em'', em, ''min'', minutos_parado) order by em), ''[]''::jsonb)
            from private.ajuste_robo_alarmes where em >= v_ini)));');
  if d not like '%ajuste_robo_travado%' then raise exception 'painel: troca nao aplicada'; end if;
  execute d;
end $mig$;
