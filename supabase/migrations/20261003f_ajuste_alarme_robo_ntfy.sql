-- 2026-10-03: alarme do robo travado tambem como NOTIFICACAO NO CELULAR (app ntfy, gratuito, sem cadastro).
-- O CallMeBot (WhatsApp) esta lotado e sem cadastro novo; o ntfy funciona ja. Os dois ficam ligados:
-- cada um so envia se estiver configurado.
--   * ntfy: topico (nome secreto) em private.ajuste_alerta_whatsapp.ntfy_topico -- definido direto no banco, nao no codigo
--   * WhatsApp: chave do CallMeBot no Vault ('callmebot_apikey')

alter table private.ajuste_alerta_whatsapp add column if not exists ntfy_topico text;

create or replace function private.ajuste_enviar_alerta(p_titulo text, p_texto text, p_prioridade int default 4, p_tag text default 'warning')
returns bigint language plpgsql security definer set search_path to '' as $$
declare c record; v_ntfy bigint; v_wa bigint;
begin
  select * into c from private.ajuste_alerta_whatsapp where id = 1 and ativo;
  if not found then return null; end if;
  if coalesce(btrim(c.ntfy_topico),'') <> '' then
    v_ntfy := net.http_post(
      url := 'https://ntfy.sh/',
      body := jsonb_build_object('topic', c.ntfy_topico, 'title', p_titulo, 'message', p_texto,
                                 'priority', p_prioridade, 'tags', jsonb_build_array(p_tag), 'markdown', true),
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 15000);
  end if;
  v_wa := private.ajuste_enviar_whatsapp('*' || p_titulo || '*' || chr(10) || p_texto);
  return coalesce(v_ntfy, v_wa);
end $$;
revoke all on function private.ajuste_enviar_alerta(text, text, int, text) from public;

create or replace function private.ajuste_vigiar_robo()
returns void language plpgsql security definer set search_path to '' as $$
declare j jsonb := private.ajuste_robo_travado(); v_trav boolean := (j->>'travado')::boolean;
  u record; v_ini timestamptz; v_min int; v_req bigint; v_hora text := to_char(now() at time zone 'America/Recife', 'HH24:MI');
  v_lembrete int := coalesce((select lembrete_min from private.ajuste_alerta_whatsapp where id = 1), 30);
begin
  select * into u from private.ajuste_robo_alarmes order by em desc limit 1;
  v_min := round(extract(epoch from (now() - coalesce((j->>'parado_desde')::timestamptz, now()))) / 60);

  if v_trav and (u.tipo is null or u.tipo = 'VOLTOU') then
    v_req := private.ajuste_enviar_alerta('🚨 Robô Ajuste TRAVADO (' || v_hora || ')',
      'Nenhum pedido sai há ' || v_min || ' min. ' || (j->>'esperando') || ' pedido(s) esperando.' || chr(10) ||
      'O link foi pausado: as lojas estão sendo mandadas pro WhatsApp.' || chr(10) ||
      '👉 Reiniciar o robô / o Seta no PC da Controladoria.', 5, 'rotating_light');
    insert into private.ajuste_robo_alarmes(tipo, parado_desde, esperando, fila, whatsapp_req)
    values ('TRAVOU', (j->>'parado_desde')::timestamptz, (j->>'esperando')::int, (j->>'fila')::int, v_req);

  elsif v_trav and u.em < now() - make_interval(mins => v_lembrete) then
    select parado_desde into v_ini from private.ajuste_robo_alarmes where tipo = 'TRAVOU' order by em desc limit 1;
    v_req := private.ajuste_enviar_alerta('⚠️ Robô CONTINUA travado (' || v_hora || ')',
      'Parado há ' || round(extract(epoch from (now() - coalesce(v_ini, now()))) / 60) || ' min. ' ||
      (j->>'esperando') || ' pedido(s) esperando. Link segue pausado.', 5, 'warning');
    insert into private.ajuste_robo_alarmes(tipo, parado_desde, esperando, fila, whatsapp_req)
    values ('LEMBRETE', v_ini, (j->>'esperando')::int, (j->>'fila')::int, v_req);

  elsif not v_trav and u.tipo in ('TRAVOU','LEMBRETE') then
    select parado_desde into v_ini from private.ajuste_robo_alarmes where tipo = 'TRAVOU' order by em desc limit 1;
    v_min := round(extract(epoch from (now() - coalesce(v_ini, now()))) / 60);
    v_req := private.ajuste_enviar_alerta('✅ Robô Ajuste VOLTOU (' || v_hora || ')',
      'Ficou parado ' || v_min || ' min. Link reaberto. Fila agora: ' || (j->>'fila') || '.', 3, 'white_check_mark');
    insert into private.ajuste_robo_alarmes(tipo, parado_desde, esperando, fila, minutos_parado, whatsapp_req)
    values ('VOLTOU', v_ini, (j->>'esperando')::int, (j->>'fila')::int, v_min, v_req);
  end if;
end $$;
revoke all on function private.ajuste_vigiar_robo() from public;
