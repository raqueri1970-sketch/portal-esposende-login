-- Almoxarifado: data de carga de cada base (10/11/2026).
-- O "Atualizado na nuvem" do módulo muda a cada salvamento, mesmo quando só uma base foi trocada
-- (ex.: 10/11 10:19 foi carregada só a Fortpel; consumo e estoque continuavam de 09/11).
-- Este gatilho grava em payload.dbCargas, por base, quando ela mudou de verdade, quem carregou e
-- quantas linhas tem. O painel da Visão Geral mostra essas datas e avisa base velha.
create or replace function portal_private.portal_sync_alm_registra_cargas()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  k text;
  cargas jsonb;
  enviado jsonb;
  quem text;
begin
  if new.module_id <> 'alm' or new.payload is null or jsonb_typeof(new.payload) <> 'object'
     or old.payload is null or jsonb_typeof(old.payload) <> 'object' then
    return new;
  end if;
  cargas := case when jsonb_typeof(old.payload->'dbCargas') = 'object' then old.payload->'dbCargas' else '{}'::jsonb end;
  -- Se quem grava mandou dbCargas, fica, por base, a data mais recente (cópia antiga não volta a data).
  enviado := case when jsonb_typeof(new.payload->'dbCargas') = 'object' then new.payload->'dbCargas' else '{}'::jsonb end;
  for k in select jsonb_object_keys(enviado) loop
    if jsonb_typeof(enviado->k) = 'object' and coalesce(enviado->k->>'em','') > coalesce(cargas->k->>'em','') then
      cargas := jsonb_set(cargas, array[k], enviado->k, true);
    end if;
  end loop;
  begin
    quem := (select u.email from auth.users u where u.id = auth.uid());
  exception when others then quem := null; end;
  foreach k in array array['dbConsumoRaw','dbEstoqueRaw','dbFortpelRaw','dbEstoqueTI','dbConsumoTI'] loop
    if jsonb_typeof(new.payload->k) = 'array' and (new.payload->k) is distinct from (old.payload->k) then
      cargas := jsonb_set(cargas, array[k], jsonb_build_object(
        'em', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'por', quem,
        'linhas', jsonb_array_length(new.payload->k),
        'antes', case when jsonb_typeof(old.payload->k) = 'array' then jsonb_array_length(old.payload->k) end
      ), true);
    end if;
  end loop;
  new.payload := jsonb_set(new.payload, '{dbCargas}', cargas, true);
  -- O módulo não reenvia dbCargas: regravação idêntica continua sendo ignorada (sem histórico).
  if new.payload = old.payload then return null; end if;
  return new;
end
$function$;

-- Roda depois de b_portal_sync_alm_preserva_bases (ordem alfabética dos gatilhos).
drop trigger if exists b_portal_sync_alm_registra_cargas on public.portal_sync;
create trigger b_portal_sync_alm_registra_cargas
  before update on public.portal_sync
  for each row when (new.module_id = 'alm')
  execute function portal_private.portal_sync_alm_registra_cargas();
