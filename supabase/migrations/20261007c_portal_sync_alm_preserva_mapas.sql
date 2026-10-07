-- Aplicado em 07/10/2026 (projeto "sistema de auditoria").
--
-- Almoxarifado: mapas que chegam vazios mantêm os da nuvem.
-- 07/10 09:33 um PC gravou o módulo com dbRegionaisMap/dbVerbaMap/dbLojaNomeMap vazios:
-- todas as lojas viraram "NÃO MAPEADO" e "SEM LIMITE" (inclusive para o Roberto).
-- A proteção de 06/10 cobria só as listas (consumo, estoque, Fortpel); agora cobre os mapas também.
create or replace function portal_private.portal_sync_alm_preserva_bases() returns trigger
language plpgsql set search_path = '' as 'declare k text; begin
 if new.module_id <> ''alm'' or old.payload is null or jsonb_typeof(old.payload) <> ''object'' then return new; end if;
 if new.payload is null or jsonb_typeof(new.payload) <> ''object'' then new.payload := ''{}''::jsonb; end if;
 foreach k in array array[''dbConsumoRaw'',''dbEstoqueRaw'',''dbFortpelRaw'',''dbConsumoTI'',''dbEstoqueTI''] loop
   if jsonb_typeof(old.payload->k) = ''array'' and jsonb_array_length(old.payload->k) > 0
      and (new.payload->k is null or jsonb_typeof(new.payload->k) <> ''array'' or jsonb_array_length(new.payload->k) = 0) then
     new.payload := jsonb_set(new.payload, array[k], old.payload->k, true);
   end if;
 end loop;
 foreach k in array array[''dbRegionaisMap'',''dbVerbaMap'',''dbLojaNomeMap'',''estoqueMinOverrides'',''estoqueMinOverridesTI''] loop
   if jsonb_typeof(old.payload->k) = ''object'' and old.payload->k <> ''{}''::jsonb
      and (new.payload->k is null or jsonb_typeof(new.payload->k) <> ''object'' or new.payload->k = ''{}''::jsonb) then
     new.payload := jsonb_set(new.payload, array[k], old.payload->k, true);
   end if;
 end loop;
 if new.payload = old.payload then return null; end if;
 return new; end';

-- Correção de dados (registro, não reexecutar): mapas restaurados de portal_sync_historico.id 7008
-- (06/10 19:26: 67 regionais, 64 verbas, 67 nomes de loja).
