-- 2026-10-03 (b): ajuste pelo WhatsApp so conta quando a CONTROLADORIA respondeu "feito".
-- * relatorio do Seta sozinho NAO conta mais como prova para o painel;
-- * "feito" mandado pela propria loja (quem pediu) NAO conta: o confirmador tem que ser
--   outra pessoa que nao o solicitante, e nao pode estar em branco;
-- * leitor_confirmar passa a ignorar "feito" vindo do proprio solicitante (antes ele
--   marcava o pedido como feito e "gastava" a confirmacao).

create or replace function private.ajuste_wa_feito(p_origem text, p_confirmado timestamptz, p_por text, p_remetente text)
returns boolean language sql immutable set search_path to '' as $$
  select p_origem is distinct from 'WHATSAPP'
      or (p_confirmado is not null and btrim(coalesce(p_por,'')) <> '' and btrim(p_por) is distinct from btrim(coalesce(p_remetente,'')))
$$;

-- ---------------------------------------------------------------- painel (base)
CREATE OR REPLACE FUNCTION public.ajuste_painel_base(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id bigint; v_hoje date := (now() at time zone 'America/Recife')::date;
  v_ini timestamptz := ((now() at time zone 'America/Recife')::date)::timestamp at time zone 'America/Recife';
  r jsonb;
begin
  select id into v_id from public.ajuste_painel_links
   where token_hash = encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and ativo and (expira_em is null or expira_em > now());
  if v_id is null then raise exception 'link invalido ou revogado'; end if;
  update public.ajuste_painel_links set acessos = case when ultimo_acesso is null or ultimo_acesso < now() - interval '5 minutes' then acessos + 1 else acessos end, ultimo_acesso = now() where id = v_id and (ultimo_acesso is null or ultimo_acesso < now() - interval '30 seconds');

  with reg as (
    select r.loja, upper(btrim(r.regional)) as regional from public.ajuste_cadastro_regionais r where exists (select 1 from public.ajuste_cadastro_lotes where tipo = 'regionais')
    union all
    select e.key::int, upper(btrim(e.value))
      from public.portal_sync s, jsonb_each_text(coalesce(s.payload->'dbRegionaisMap','{}'::jsonb)) e
     where s.module_id = 'alm' and e.key ~ '^[0-9]+$' and not exists (select 1 from public.ajuste_cadastro_lotes where tipo = 'regionais')),
  t as (
    select a.*, l.codigo_seta, l.nome_seta, coalesce(g.regional,'SEM REGIONAL') as regional
      from public.ajuste_estoque_entrada a
      left join public.entrada_estoque_lojas l on l.loja_normalizada = a.loja_normalizada
      left join reg g on g.loja = a.loja_normalizada
     where a.criado_em >= v_ini - interval '6 days'
       and private.ajuste_wa_feito(a.origem, a.wa_confirmado_em, a.wa_confirmado_por, a.wa_remetente)),   -- 2026-10-03: WhatsApp so com "feito" da Controladoria
  h as (select * from t where criado_em >= v_ini and status <> 'CANCELADO'),
  hc as (select * from h where status = 'CONCLUIDO'), hcl as (select * from hc where venda_status <> 'NAO_SE_APLICA')
  select jsonb_build_object(
    'agora', now(),
    'hoje_data', v_hoje,
    'robo', (select jsonb_build_object('online', coalesce(bool_or(ativo and heartbeat_em > now() - interval '90 seconds'),false),
                'status', (select d2.status from private.executor_devices d2 where d2.ativo order by coalesce(d2.heartbeat_em > now() - interval '90 seconds', false) desc, case d2.status when 'EXECUTANDO' then 0 when 'OCIOSO' then 1 else 2 end, d2.heartbeat_em desc nulls last limit 1),
                'detalhe', (select string_agg(case d2.device_name when 'EXEC-SETA-CONTROLADORIA' then 'D90' when 'EXEC-SETA-D-40-PDV31' then 'PC31' else d2.device_name end || ': ' || coalesce(d2.status, '?'), ' · ' order by d2.device_name) from private.executor_devices d2 where d2.ativo and d2.heartbeat_em > now() - interval '90 seconds'),
                'ultimo_sinal', max(heartbeat_em)) from private.executor_devices where ativo),
    'fila', jsonb_build_object(
        'pendentes', (select count(*) from public.ajuste_estoque_entrada where status = 'PENDENTE'),
        'executando', (select count(*) from public.ajuste_estoque_entrada where status = 'EM_EXECUCAO'),
        'problemas', (select count(*) from public.ajuste_estoque_entrada where status in ('ERRO','BLOQUEADO_DIVERGENCIA') and criado_em >= v_ini - interval '6 days')),
    'hoje', jsonb_build_object(
        'pedidos', (select count(*) from h),
        'ajustados', (select count(*) from hc),
        'unidades', (select coalesce(sum(quantidade),0) from hc),
        'lojas', (select count(distinct loja_normalizada) from hc),
        'vendeu', (select count(*) from hcl where venda_status = 'VENDA_CONFIRMADA'),
        'aguardando', (select count(*) from hcl where venda_status = 'AGUARDANDO_VENDA'),
        'nao_vendeu', (select count(*) from hcl where venda_status = 'VENDA_NAO_REALIZADA'),
        'sem_foto', (select count(*) from hcl where not comprovado),
        'foto_confere', (select count(*) from hcl where foto_codigo_status in ('CONFERE','CONFERIDO_MANUAL')),
        'foto_conferir', (select count(*) from hcl where comprovado and foto_codigo_status in ('PROVAVEL','NAO_VERIFICADO')),
        'foto_nao_confere', (select count(*) from hcl where foto_codigo_status in ('NAO_LOCALIZADO','ILEGIVEL','DIVERGENTE_MANUAL')),
        'wa_ajustes', (select count(*) from hc where origem = 'WHATSAPP'), 'wa_confirmados', (select count(*) from hc where origem = 'WHATSAPP'),
        'wa_sem_confirmacao', (select count(*) from public.ajuste_estoque_entrada x where x.origem = 'WHATSAPP' and x.criado_em >= v_ini and x.status <> 'CANCELADO'
                                  and not private.ajuste_wa_feito(x.origem, x.wa_confirmado_em, x.wa_confirmado_por, x.wa_remetente)),
        'erros', (select count(*) from h where status in ('ERRO','BLOQUEADO_DIVERGENCIA')),
        'tempo_medio_robo', (select round(avg(nullif((seta_retorno::jsonb->>'total'),'')::numeric)) from hc where seta_retorno is not null and seta_retorno like '{%')),
    'dias', (select jsonb_agg(jsonb_build_object('dia', d::date, 'pedidos', coalesce(x.p,0), 'ajustados', coalesce(x.c,0)) order by d)
               from generate_series(v_hoje - 6, v_hoje, interval '1 day') d
               left join (select (criado_em at time zone 'America/Recife')::date as dia, count(*) filter (where status <> 'CANCELADO') p, count(*) filter (where status = 'CONCLUIDO') c from t group by 1) x on x.dia = d::date),
    'horas', (select jsonb_agg(jsonb_build_object('h', g, 'pedidos', coalesce(x.p,0)) order by g)
               from generate_series(0,23) g
               left join (select extract(hour from criado_em at time zone 'America/Recife')::int hh, count(*) p from h group by 1) x on x.hh = g),
    'lojas', (select coalesce(jsonb_agg(z), '[]'::jsonb) from (select jsonb_build_object('loja', codigo_seta, 'nome', nome_seta, 'regional', regional, 'pedidos', count(*), 'ajustados', count(*) filter (where status='CONCLUIDO')) z
               from h group by codigo_seta, nome_seta, regional order by count(*) desc limit 10) q),
    'regionais', (select coalesce(jsonb_agg(z), '[]'::jsonb) from (select jsonb_build_object('regional', regional, 'pedidos', count(*), 'ajustados', count(*) filter (where status='CONCLUIDO')) z
               from h group by regional order by count(*) desc) q),
    'alertas', (select coalesce(jsonb_agg(z), '[]'::jsonb) from (select jsonb_build_object('loja', codigo_seta, 'nome', nome_seta, 'produto', codigo_produto, 'qtd', quantidade, 'horas', round(extract(epoch from (now() - executado_em))/3600.0, 1), 'foto', comprovado) z
               from h where status = 'CONCLUIDO' and venda_status = 'AGUARDANDO_VENDA' and executado_em is not null order by executado_em limit 10) q),
    'feed', (select coalesce(jsonb_agg(z), '[]'::jsonb) from (select jsonb_build_object('id', id, 'quando', greatest(criado_em, coalesce(executado_em, criado_em), coalesce(venda_confirmada_em, criado_em)),
                 'loja', codigo_seta, 'nome', nome_seta, 'produto', codigo_produto, 'marca', marca, 'qtd', quantidade, 'status', status, 'venda', venda_status, 'foto', comprovado, 'foto_cod', foto_codigo_status, 'origem', origem, 'wa_ok', private.ajuste_wa_feito(origem, wa_confirmado_em, wa_confirmado_por, wa_remetente) and origem = 'WHATSAPP',
                 'seg', case when executado_em is not null then round(extract(epoch from (executado_em - criado_em))) end) z
               from t where status <> 'CANCELADO' order by greatest(criado_em, coalesce(executado_em, criado_em), coalesce(venda_confirmada_em, criado_em)) desc limit 14) q)
  ) into r;
  return r;
end $function$;

-- ---------------------------------------------------------------- painel (custo / cadastro)
CREATE OR REPLACE FUNCTION public.ajuste_painel(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r jsonb; v_ini timestamptz := ((now() at time zone 'America/Recife')::date)::timestamp at time zone 'America/Recife';
begin
  r := public.ajuste_painel_base(p_token);
  r := jsonb_set(r, '{hoje,fora_cadastro}', to_jsonb((select count(*) from public.ajuste_estoque_entrada where criado_em >= v_ini and status <> 'CANCELADO' and cadastro_status in ('FORA_CADASTRO','DESLIGADO') and private.ajuste_wa_feito(origem, wa_confirmado_em, wa_confirmado_por, wa_remetente))));
  r := r || jsonb_build_object('custo', jsonb_build_object(
    'hoje', (select jsonb_build_object('total', coalesce(sum(custo_total),0), 'venda', coalesce(sum(valor_ajuste_venda),0), 'pecas', coalesce(sum(quantidade) filter (where custo_total is not null),0), 'sem_custo', count(*) filter (where custo_total is null)) from public.ajuste_estoque_entrada where criado_em >= v_ini and status <> 'CANCELADO' and private.ajuste_wa_feito(origem, wa_confirmado_em, wa_confirmado_por, wa_remetente)),
    'sete_dias', (select jsonb_build_object('total', coalesce(sum(custo_total),0), 'venda', coalesce(sum(valor_ajuste_venda),0), 'pecas', coalesce(sum(quantidade) filter (where custo_total is not null),0), 'sem_custo', count(*) filter (where custo_total is null)) from public.ajuste_estoque_entrada where criado_em >= v_ini - interval '6 days' and status <> 'CANCELADO' and private.ajuste_wa_feito(origem, wa_confirmado_em, wa_confirmado_por, wa_remetente)),
    'dias', (select jsonb_agg(jsonb_build_object('dia', g::date, 'total', coalesce(x.t,0)) order by g)
               from generate_series(((now() at time zone 'America/Recife')::date) - 6, (now() at time zone 'America/Recife')::date, interval '1 day') g
               left join (select (criado_em at time zone 'America/Recife')::date dia, sum(custo_total) t from public.ajuste_estoque_entrada where criado_em >= v_ini - interval '6 days' and status <> 'CANCELADO' and private.ajuste_wa_feito(origem, wa_confirmado_em, wa_confirmado_por, wa_remetente) group by 1) x on x.dia = g::date)));
  r := r || jsonb_build_object('sangue_azul', (select jsonb_build_object(
      'feitos', count(*) filter (where status = 'CONCLUIDO'),
      'unidades', coalesce(sum(quantidade) filter (where status = 'CONCLUIDO'), 0),
      'erros', count(*) filter (where status in ('ERRO','BLOQUEADO_DIVERGENCIA')),
      'na_fila', count(*) filter (where status in ('PENDENTE','EM_EXECUCAO')),
      'lojas', count(distinct loja_normalizada) filter (where status = 'CONCLUIDO'),
      'tempo_medio_seg', round(avg(extract(epoch from (executado_em - criado_em))) filter (where status = 'CONCLUIDO' and executado_em is not null)),
      'ultimo', (select jsonb_build_object('quando', u.executado_em, 'loja', u.loja_normalizada, 'produto', u.codigo_produto, 'marca', u.marca, 'qtd', u.quantidade)
                   from public.ajuste_estoque_entrada u where u.origem = 'LINK' and u.status = 'CONCLUIDO' and u.executado_em >= v_ini order by u.executado_em desc limit 1))
    from public.ajuste_estoque_entrada where origem = 'LINK' and criado_em >= v_ini and status <> 'CANCELADO'));
  return r || jsonb_build_object(
    'link_ativo', coalesce((select (valor->>'ativo')::boolean from public.ajuste_config where chave = 'link_pedidos'), true), 'leitor', (select jsonb_build_object('configurado', count(*) > 0, 'online', coalesce(bool_or(ativo and status = 'ONLINE' and heartbeat_em > now() - interval '120 seconds'), false), 'ultimo_sinal', max(heartbeat_em)) from private.leitores_whatsapp where ativo),
    'whatsapp', jsonb_build_object(
    'hoje', (select count(*) from public.ajuste_whatsapp_cliques where criado_em >= v_ini),
    'lojas_hoje', (select count(distinct loja_normalizada) from public.ajuste_whatsapp_cliques where criado_em >= v_ini),
    'sete_dias', (select count(*) from public.ajuste_whatsapp_cliques where criado_em >= v_ini - interval '6 days'),
    'dias', (select jsonb_agg(jsonb_build_object('dia', d::date, 'n', coalesce(x.n,0)) order by d)
               from generate_series(((now() at time zone 'America/Recife')::date) - 6, (now() at time zone 'America/Recife')::date, interval '1 day') d
               left join (select (criado_em at time zone 'America/Recife')::date dia, count(*) n from public.ajuste_whatsapp_cliques where criado_em >= v_ini - interval '6 days' group by 1) x on x.dia = d::date),
    'ultimos', (select coalesce(jsonb_agg(z), '[]'::jsonb) from (select jsonb_build_object('quando', criado_em, 'loja', loja, 'origem', origem) z from public.ajuste_whatsapp_cliques order by criado_em desc limit 6) q)));
end $function$;


-- ---------------------------------------------------------------- leitor: "feito" so da Controladoria
CREATE OR REPLACE FUNCTION public.leitor_confirmar(p_token text, p_device text, p_msg_ref text, p_chat_id text, p_por text, p_quando timestamp with time zone)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_leitor bigint := private.leitor_validar(p_token, p_device); n integer := 0; v_alvo bigint;
  v_por text := btrim(coalesce(p_por,''));
begin
  -- sem saber quem respondeu, nao da pra dizer que foi a Controladoria
  if v_por = '' then return 0; end if;
  if p_msg_ref is not null and btrim(p_msg_ref) <> '' then
    select id into v_alvo from public.ajuste_estoque_entrada
     where wa_msg_id = p_msg_ref and wa_confirmado_em is null and btrim(coalesce(wa_remetente,'')) is distinct from v_por;
  end if;
  if v_alvo is null then
    select id into v_alvo from public.ajuste_estoque_entrada
     where origem = 'WHATSAPP' and wa_chat = p_chat_id and wa_confirmado_em is null and criado_em > now() - interval '6 hours'
       and btrim(coalesce(wa_remetente,'')) is distinct from v_por
     order by criado_em desc limit 1;
  end if;
  if v_alvo is not null then
    update public.ajuste_estoque_entrada set wa_confirmado_em = coalesce(p_quando, now()), wa_confirmado_por = left(v_por,80), atualizado_em = now() where id = v_alvo;
    n := 1;
  end if;
  return n;
end $function$;

-- private.ajuste_wa_real (versao anterior) ficou sem uso; pode ser removida depois:
-- drop function if exists private.ajuste_wa_real(text, timestamptz, bigint);
