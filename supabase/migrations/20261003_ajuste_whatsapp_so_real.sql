-- 2026-10-03: Ajuste pelo WhatsApp so aparece no painel quando e REAL.
--
-- Antes: o leitor do WhatsApp gravava toda mensagem que "parecia pedido" ja como CONCLUIDO,
-- e o painel (Movimento ao vivo, KPIs, graficos, custo) mostrava como "Ajustado" mesmo
-- quando a Controladoria nunca fez o ajuste (conversa, duvida, modelo de mensagem, pedido recusado).
--
-- Agora um ajuste de origem WHATSAPP so conta quando ha PROVA de que foi feito:
--   * a Controladoria respondeu/confirmou na conversa (wa_confirmado_em), ou
--   * o acerto foi encontrado no relatorio do Seta (seta_acerto_id).
-- Sem prova ele continua gravado (auditoria), mas fica fora do painel ate ser confirmado.
--
-- Tambem corrige o leitor: numeracao do calcado (Tam 39, Numero 37, "20214 - 36") estava
-- sendo lida como QUANTIDADE (39 pares). Quantidade de 10 a 50 vinda do WhatsApp agora vira 1
-- (pedido de loja e sempre 1 ou 2 pares) e o valor lido fica anotado.

create or replace function private.ajuste_wa_real(p_origem text, p_confirmado timestamptz, p_seta bigint)
returns boolean language sql immutable set search_path to '' as $$
  select p_origem is distinct from 'WHATSAPP' or p_confirmado is not null or p_seta is not null
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
       and private.ajuste_wa_real(a.origem, a.wa_confirmado_em, a.seta_acerto_id)),   -- 2026-10-03: WhatsApp so o que e real
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
        'wa_ajustes', (select count(*) from hc where origem = 'WHATSAPP'), 'wa_confirmados', (select count(*) from hc where origem = 'WHATSAPP' and wa_confirmado_em is not null),
        'wa_sem_confirmacao', (select count(*) from public.ajuste_estoque_entrada x where x.origem = 'WHATSAPP' and x.criado_em >= v_ini and x.status <> 'CANCELADO'
                                  and not private.ajuste_wa_real(x.origem, x.wa_confirmado_em, x.seta_acerto_id)),
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
                 'loja', codigo_seta, 'nome', nome_seta, 'produto', codigo_produto, 'marca', marca, 'qtd', quantidade, 'status', status, 'venda', venda_status, 'foto', comprovado, 'foto_cod', foto_codigo_status, 'origem', origem, 'wa_ok', (wa_confirmado_em is not null), 'wa_seta', (seta_acerto_id is not null),
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
  r := jsonb_set(r, '{hoje,fora_cadastro}', to_jsonb((select count(*) from public.ajuste_estoque_entrada where criado_em >= v_ini and status <> 'CANCELADO' and cadastro_status in ('FORA_CADASTRO','DESLIGADO') and private.ajuste_wa_real(origem, wa_confirmado_em, seta_acerto_id))));
  r := r || jsonb_build_object('custo', jsonb_build_object(
    'hoje', (select jsonb_build_object('total', coalesce(sum(custo_total),0), 'venda', coalesce(sum(valor_ajuste_venda),0), 'pecas', coalesce(sum(quantidade) filter (where custo_total is not null),0), 'sem_custo', count(*) filter (where custo_total is null)) from public.ajuste_estoque_entrada where criado_em >= v_ini and status <> 'CANCELADO' and private.ajuste_wa_real(origem, wa_confirmado_em, seta_acerto_id)),
    'sete_dias', (select jsonb_build_object('total', coalesce(sum(custo_total),0), 'venda', coalesce(sum(valor_ajuste_venda),0), 'pecas', coalesce(sum(quantidade) filter (where custo_total is not null),0), 'sem_custo', count(*) filter (where custo_total is null)) from public.ajuste_estoque_entrada where criado_em >= v_ini - interval '6 days' and status <> 'CANCELADO' and private.ajuste_wa_real(origem, wa_confirmado_em, seta_acerto_id)),
    'dias', (select jsonb_agg(jsonb_build_object('dia', g::date, 'total', coalesce(x.t,0)) order by g)
               from generate_series(((now() at time zone 'America/Recife')::date) - 6, (now() at time zone 'America/Recife')::date, interval '1 day') g
               left join (select (criado_em at time zone 'America/Recife')::date dia, sum(custo_total) t from public.ajuste_estoque_entrada where criado_em >= v_ini - interval '6 days' and status <> 'CANCELADO' and private.ajuste_wa_real(origem, wa_confirmado_em, seta_acerto_id) group by 1) x on x.dia = g::date)));
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

-- ---------------------------------------------------------------- leitor: numeracao nao e quantidade
CREATE OR REPLACE FUNCTION public.leitor_ingerir(p_token text, p_device text, p_msg_id text, p_chat_id text, p_chat_tipo text, p_chat_nome text, p_remetente_nome text, p_remetente_tel text, p_texto text, p_recebido_em timestamp with time zone, p_loja integer, p_cpf text, p_produto text, p_qtd integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_leitor bigint := private.leitor_validar(p_token, p_device);
  v_cpf text := regexp_replace(coalesce(p_cpf,''),'\D','','g');
  v_prod text := regexp_replace(coalesce(p_produto,''),'\D','','g');
  v_quando timestamptz := coalesce(p_recebido_em, now());
  v_sys uuid := '00000000-0000-0000-0000-00000000aa01';
  v_qtd integer := p_qtd; v_obs_qtd text := '';
  l record; c record; v_res text; v_id bigint; v_nome text; v_m text[];
begin
  if p_msg_id is null or btrim(p_msg_id) = '' then raise exception 'msg_id obrigatorio'; end if;
  if exists (select 1 from public.ajuste_whatsapp_mensagens where wa_msg_id = p_msg_id) then return jsonb_build_object('resultado','JA_LIDA'); end if;
  -- 2026-10-02: CPF tolerante. Se o leitor nao achou, procura "CPF" no texto (com ou sem pontos);
  -- CPF com 10 digitos (zero da frente omitido) vale se ficar valido com o zero.
  if v_cpf = '' then
    v_m := regexp_match(coalesce(p_texto,''), 'cpf\D{0,6}(\d[\d.\s-]{7,16}\d)', 'i');
    if v_m is not null then v_cpf := regexp_replace(v_m[1],'\D','','g'); end if;
  end if;
  if length(v_cpf) = 10 and public.ajuste_cpf_valido('0' || v_cpf) then v_cpf := '0' || v_cpf; end if;
  -- 2026-10-03: numeracao do calcado lida como quantidade (Tam 39, Numero 37, "20214 - 36" => 39 pares).
  -- Pedido de loja pelo WhatsApp e de 1 ou 2 pares: 10 a 50 e numeracao -> vira 1 e fica anotado.
  if v_qtd between 10 and 50 then
    v_obs_qtd := ' | QTD LIDA ' || v_qtd || ' ERA NUMERACAO -> 1 PAR';
    v_qtd := 1;
  end if;
  select * into l from public.entrada_estoque_lojas where loja_normalizada = p_loja and ativo;
  if p_loja is null then v_res := 'SEM_LOJA';
  elsif not found then v_res := 'LOJA_NAO_ENCONTRADA';
  elsif v_cpf = '' then v_res := 'SEM_CPF';
  elsif not public.ajuste_cpf_valido(v_cpf) then v_res := 'CPF_INVALIDO';
  elsif v_prod = '' then v_res := 'SEM_PRODUTO';
  elsif v_qtd is null or v_qtd < 1 or v_qtd > 999 then v_res := 'SEM_QUANTIDADE';
  elsif v_qtd > 50 then v_res := 'QUANTIDADE_ALTA';
  elsif v_quando > now() + interval '5 minutes' or v_quando < now() - interval '400 days' then v_res := 'DATA_INVALIDA';
  elsif exists (select 1 from public.ajuste_estoque_entrada a where a.origem = 'WHATSAPP' and a.wa_chat = p_chat_id and a.loja_normalizada = p_loja and a.codigo_produto = v_prod
        and a.quantidade = v_qtd and a.solicitante_cpf_mask = public.ajuste_cpf_mask(v_cpf) and a.status <> 'CANCELADO' and abs(extract(epoch from (a.criado_em - v_quando))) < 3600)
    then v_res := 'DUPLICADO_PROVAVEL';
  elsif exists (select 1 from public.ajuste_estoque_entrada a where a.origem = 'LINK' and a.loja_normalizada = p_loja and a.codigo_produto = v_prod and a.quantidade = v_qtd
        and a.status <> 'CANCELADO' and abs(extract(epoch from (a.criado_em - v_quando))) < 3600)
    then v_res := 'DUPLICADO_DO_LINK';
  else v_res := 'CRIADO'; end if;

  if v_res = 'CRIADO' then
    select * into c from private.ajuste_cadastro_de(v_cpf);
    v_nome := upper(coalesce(c.nome, nullif(btrim(coalesce(p_remetente_nome,'')),''), 'SEM CADASTRO'));
    insert into public.ajuste_estoque_entrada(
        user_id, loja, loja_normalizada, codigo_seta_solicitado, solicitante, codigo_produto, quantidade, motivo, status, operacao, finalidade,
        declaracao_venda, comprovado, etapa_executor, executor_device, executado_em, criado_em, atualizado_em, loja_validada,
        venda_status, foto_codigo_status, solicitante_cpf_mask, cargo_seta, cadastro_status, loja_origem, fora_da_loja,
        origem, wa_msg_id, wa_chat, wa_remetente, erro_executor)
    values (
        v_sys, p_loja::text, p_loja, l.codigo_seta, v_nome, v_prod, v_qtd,
        left('AJUSTE DE LOJA PEDIDO PELO CPF ' || substr(v_cpf,1,3) || '.' || substr(v_cpf,4,3) || '.' || substr(v_cpf,7,3) || '-' || substr(v_cpf,10,2) || ' - ' || v_nome || ' (WHATSAPP)', 200),
        'CONCLUIDO', 'ENTRADA', 'VENDA', true, false, 'CONCLUIDO', 'LEITOR-WHATSAPP', v_quando, v_quando, now(), true,
        'AGUARDANDO_VENDA', 'SEM_FOTO', public.ajuste_cpf_mask(v_cpf), c.cargo,
        case when c.nome is null then 'FORA_CADASTRO' when c.situacao ilike 'deslig%' then 'DESLIGADO' else 'CADASTRADO' end,
        c.loja_origem, (c.loja_origem is not null and c.loja_origem <> p_loja),
        'WHATSAPP', p_msg_id, p_chat_id, left(coalesce(p_remetente_nome,''),80), 'LIDO DO WHATSAPP: ajuste feito a mao no Seta (nada foi lancado pelo robo)' || v_obs_qtd)
    returning id into v_id;
  end if;

  insert into public.ajuste_whatsapp_mensagens(wa_msg_id, chat_id, chat_tipo, chat_nome, remetente_nome, remetente_tel, texto, recebido_em, reconhecido, ajuste_id, resultado)
  values (p_msg_id, p_chat_id, left(p_chat_tipo,20), left(p_chat_nome,120), left(p_remetente_nome,80), left(p_remetente_tel,30),
    left(regexp_replace(regexp_replace(coalesce(p_texto,''), '(\d{3})[.\s]?(\d{3})[.\s]?(\d{3})[-\s]?(\d{2})', '\1.***.***-\4', 'g'), '(cpf\D{0,6})\d{9,10}(?!\d)', '\1***', 'gi'), 600),
    v_quando, v_res = 'CRIADO', v_id, v_res);
  return jsonb_build_object('resultado', v_res, 'id', v_id);
end $function$;
