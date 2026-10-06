-- Aplicado em 06/10/2026 (projeto "sistema de auditoria").
--
-- 1) Cópia antiga não sobrescreve cópia nova.
-- Um computador com cópia antiga de um módulo regravava essa cópia na nuvem por cima do
-- que o Roberto acabou de enviar. Ex.: 06/10 16:03 o Remanejo voltou para a versão de 01/10.
-- Toda gravação traz o updated_at de quando o dado foi gerado; se for mais velho do que o
-- que já está na nuvem, a gravação é ignorada. A folga de 15 minutos evita barrar um envio
-- novo de um PC com o relógio um pouco atrasado.
create or replace function portal_private.portal_sync_bloqueia_copia_antiga() returns trigger
language plpgsql set search_path = '' as 'begin
  if new.updated_at is not null and old.updated_at is not null
     and new.updated_at < old.updated_at
     and new.updated_at < now() - interval ''15 minutes'' then
    return null; -- mantém a versão mais nova e não gera histórico
  end if;
  return new; end';

-- "a_" para rodar antes dos demais BEFORE UPDATE (ordem alfabética).
create trigger a_portal_sync_bloqueia_copia_antiga before update on public.portal_sync
  for each row execute function portal_private.portal_sync_bloqueia_copia_antiga();

-- 2) Almoxarifado não perde base já carregada.
-- Entre 01/10 e 02/10 a nuvem do Almoxarifado foi zerada várias vezes: o envio só da
-- Requisição pela Central de Upload recriava o módulo sem estoque/TI/Fortpel, e PCs
-- gravavam o módulo vazio (324 bytes). Uma base que chega vazia mantém a da nuvem;
-- base que chega com linhas substitui normalmente. Regravação idêntica é ignorada
-- (evita 1,1 MB de histórico a cada abertura).
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
 if new.payload = old.payload then return null; end if;
 return new; end';

create trigger b_portal_sync_alm_preserva_bases before update on public.portal_sync
  for each row when (new.module_id = 'alm') execute function portal_private.portal_sync_alm_preserva_bases();

-- 3) Correções de dados feitas no mesmo dia (registro, não reexecutar):
--    rem      ← portal_sync_historico.id 6953 (envio do Roberto 06/10 15:37, 2.741 pedidos);
--               a versão quebrada (RESUMO VENDAS no lugar dos pedidos) ficou no histórico.
--    saci_d1  ← {"seq":0,"data":[]} (10 cópias vazias do "Saldo de Pedidos de Transferência").
