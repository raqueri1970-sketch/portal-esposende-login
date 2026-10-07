-- Aplicado em 07/10/2026 (projeto "sistema de auditoria").
--
-- Todo o Portal: arquivo carregado permanece até chegar o próximo COM dados.
-- Lista/mapa que já tinha dados e chega vazio (ou some) numa gravação mantém o da nuvem.
-- Vale até 3 níveis (ex.: rem.D.<base>, gren.D.<base>). Carga nova com linhas substitui normalmente.
-- Fora: alm (regra própria, trigger b_), sentinela e vigilante (status de robô, zeram alertas de propósito).
-- Testado (rollback): rem/sgdf gravados como {} e gren com D.* vazios ficaram intactos;
-- nf com 5 registros no lugar de 1.595 substituiu (carga legítima).

create or replace function portal_private.jsonb_preserva_cargas(p_old jsonb, p_new jsonb, p_nivel int default 1)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare k text; o jsonb; n jsonb; r jsonb := p_new;
begin
  if jsonb_typeof(p_old) <> 'object' or jsonb_typeof(p_new) <> 'object' then return p_new; end if;
  for k, o in select * from jsonb_each(p_old) loop
    n := r -> k;
    if (jsonb_typeof(o) = 'array' and jsonb_array_length(o) > 0) or (jsonb_typeof(o) = 'object' and o <> '{}'::jsonb) then
      if n is null or jsonb_typeof(n) = 'null'
         or (jsonb_typeof(n) = 'array' and jsonb_array_length(n) = 0)
         or (jsonb_typeof(n) = 'object' and n = '{}'::jsonb) then
        r := jsonb_set(r, array[k], o, true);
      elsif jsonb_typeof(o) = 'object' and jsonb_typeof(n) = 'object' and p_nivel < 3 then
        r := jsonb_set(r, array[k], portal_private.jsonb_preserva_cargas(o, n, p_nivel + 1), true);
      end if;
    end if;
  end loop;
  return r;
end $$;

create or replace function portal_private.portal_sync_preserva_cargas() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.payload is null or jsonb_typeof(old.payload) <> 'object' then return new; end if;
  if new.payload is null or jsonb_typeof(new.payload) <> 'object' then new.payload := '{}'::jsonb; end if;
  new.payload := portal_private.jsonb_preserva_cargas(old.payload, new.payload);
  if new.payload = old.payload then return null; end if; -- regravação idêntica: ignora (sem histórico)
  return new;
end $$;

create trigger c_portal_sync_preserva_cargas before update on public.portal_sync
  for each row when (new.module_id not in ('alm','sentinela','vigilante'))
  execute function portal_private.portal_sync_preserva_cargas();
