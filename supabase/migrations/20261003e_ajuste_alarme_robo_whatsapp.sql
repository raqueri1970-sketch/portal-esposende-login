-- 2026-10-03: alarme do robo travado tambem chega no WhatsApp (via CallMeBot, gratuito, so para o dono do numero).
--
-- Mensagens:
--   * TRAVOU   -> "🚨 Robo travado ... X pedidos esperando ha Y min"
--   * LEMBRETE -> a cada 30 min enquanto continuar travado
--   * VOLTOU   -> "✅ Robo voltou, ficou parado N min"
-- O alarme cobre robo travado E robo desligado/sem sinal com pedido esperando
-- (nos dois casos nenhum pedido termina em 10 min).
--
-- A chave do CallMeBot fica no Vault (segredo 'callmebot_apikey'), nunca no codigo.
-- Sem chave cadastrada nada e enviado (o alarme continua no painel e no historico).
-- As mensagens so tem contagem de pedidos e minutos: nenhum dado de cliente ou de colaborador.

create table if not exists private.ajuste_alerta_whatsapp (
  id smallint primary key default 1 check (id = 1),
  telefone text not null,            -- formato internacional sem +, ex.: 5511947644940
  ativo boolean not null default true,
  lembrete_min integer not null default 30,
  atualizado_em timestamptz not null default now()
);
insert into private.ajuste_alerta_whatsapp(id, telefone) values (1, '5511947644940')
on conflict (id) do update set telefone = excluded.telefone, atualizado_em = now();

alter table private.ajuste_robo_alarmes drop constraint if exists ajuste_robo_alarmes_tipo_check;
alter table private.ajuste_robo_alarmes add constraint ajuste_robo_alarmes_tipo_check check (tipo in ('TRAVOU','LEMBRETE','VOLTOU'));
alter table private.ajuste_robo_alarmes add column if not exists whatsapp_req bigint;   -- id do pedido no pg_net (conferir entrega em net._http_response)

create or replace function private.urlencode(p text)
returns text language sql immutable set search_path to '' as $$
  select coalesce(string_agg(
    case when b between 48 and 57 or b between 65 and 90 or b between 97 and 122 or b in (45,46,95,126)
         then chr(b) else '%' || upper(lpad(to_hex(b), 2, '0')) end, '' order by i), '')
  from (select get_byte(convert_to(coalesce(p,''), 'UTF8'), i) b, i
          from generate_series(0, octet_length(convert_to(coalesce(p,''), 'UTF8')) - 1) i) x
$$;

create or replace function private.ajuste_enviar_whatsapp(p_texto text)
returns bigint language plpgsql security definer set search_path to '' as $$
declare c record; v_key text;
begin
  select * into c from private.ajuste_alerta_whatsapp where id = 1 and ativo;
  if not found then return null; end if;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'callmebot_apikey';
  if v_key is null or btrim(v_key) = '' then return null; end if;
  return net.http_get(
    url := 'https://api.callmebot.com/whatsapp.php?phone=' || c.telefone
           || '&text=' || private.urlencode(p_texto) || '&apikey=' || private.urlencode(btrim(v_key)),
    timeout_milliseconds := 15000);
end $$;

create or replace function private.ajuste_vigiar_robo()
returns void language plpgsql security definer set search_path to '' as $$
declare j jsonb := private.ajuste_robo_travado(); v_trav boolean := (j->>'travado')::boolean;
  u record; v_ini timestamptz; v_min int; v_req bigint; v_hora text := to_char(now() at time zone 'America/Recife', 'HH24:MI');
  v_lembrete int := coalesce((select lembrete_min from private.ajuste_alerta_whatsapp where id = 1), 30);
begin
  select * into u from private.ajuste_robo_alarmes order by em desc limit 1;
  v_min := round(extract(epoch from (now() - coalesce((j->>'parado_desde')::timestamptz, now()))) / 60);

  if v_trav and (u.tipo is null or u.tipo = 'VOLTOU') then
    v_req := private.ajuste_enviar_whatsapp(
      '🚨 *Robô Ajuste Expresso TRAVADO* (' || v_hora || ')' || chr(10) ||
      'Nenhum pedido sai há ' || v_min || ' min. ' || (j->>'esperando') || ' pedido(s) esperando.' || chr(10) ||
      'O link foi pausado: as lojas estão sendo mandadas pro WhatsApp.' || chr(10) ||
      '👉 Reiniciar o robô / o Seta no PC da Controladoria.');
    insert into private.ajuste_robo_alarmes(tipo, parado_desde, esperando, fila, whatsapp_req)
    values ('TRAVOU', (j->>'parado_desde')::timestamptz, (j->>'esperando')::int, (j->>'fila')::int, v_req);

  elsif v_trav and u.em < now() - make_interval(mins => v_lembrete) then
    select parado_desde into v_ini from private.ajuste_robo_alarmes where tipo = 'TRAVOU' order by em desc limit 1;
    v_req := private.ajuste_enviar_whatsapp(
      '⚠️ *Robô CONTINUA travado* (' || v_hora || ')' || chr(10) ||
      'Parado há ' || round(extract(epoch from (now() - coalesce(v_ini, now()))) / 60) || ' min. ' ||
      (j->>'esperando') || ' pedido(s) esperando. Link segue pausado.');
    insert into private.ajuste_robo_alarmes(tipo, parado_desde, esperando, fila, whatsapp_req)
    values ('LEMBRETE', v_ini, (j->>'esperando')::int, (j->>'fila')::int, v_req);

  elsif not v_trav and u.tipo in ('TRAVOU','LEMBRETE') then
    select parado_desde into v_ini from private.ajuste_robo_alarmes where tipo = 'TRAVOU' order by em desc limit 1;
    v_min := round(extract(epoch from (now() - coalesce(v_ini, now()))) / 60);
    v_req := private.ajuste_enviar_whatsapp(
      '✅ *Robô Ajuste Expresso VOLTOU* (' || v_hora || ')' || chr(10) ||
      'Ficou parado ' || v_min || ' min. Link reaberto. Fila agora: ' || (j->>'fila') || '.');
    insert into private.ajuste_robo_alarmes(tipo, parado_desde, esperando, fila, minutos_parado, whatsapp_req)
    values ('VOLTOU', v_ini, (j->>'esperando')::int, (j->>'fila')::int, v_min, v_req);
  end if;
end $$;

revoke all on function private.ajuste_enviar_whatsapp(text) from public;
revoke all on function private.ajuste_vigiar_robo() from public;
