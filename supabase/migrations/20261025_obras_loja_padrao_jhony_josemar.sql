-- 25/10/2026 (pedido do Ricardo): despesa sem loja informada vai para a loja padrão do prestador.
-- Jhony -> Loja Petrolina; Josemar -> Loja Maceió Centro (incluindo o "Histórico Josemar (loja não informada)").
-- JÁ APLICADA no projeto "sistema de auditoria" em 25/10/2026 (registro).
create table if not exists obras_interno.bkp_obra_padrao_20261025 as
  select id, responsavel, obra_id from public.obras_comprovantes
   where (responsavel = 'Jhony' and obra_id is null)
      or obra_id = (select id from public.obras where codigo = 'ENG-JOSEMAR');

update public.obras_remetentes set obra_id = (select id from public.obras where codigo = 'PETROLINA'), updated_at = now()
 where nome = 'Jhony' and obra_id is null;

update public.obras_comprovantes set obra_id = (select id from public.obras where codigo = 'PETROLINA'), updated_at = now()
 where responsavel = 'Jhony' and obra_id is null;

update public.obras_comprovantes set obra_id = (select id from public.obras where codigo = 'MCZ-CENTRO'), updated_at = now()
 where obra_id = (select id from public.obras where codigo = 'ENG-JOSEMAR');

-- Sem loja nenhuma e sem padrão no remetente: cai na loja padrão pelo nome do prestador
create or replace function public.obras_obra_trigger()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  if new.obra_id is null then
    new.obra_id := coalesce(public.obras_obra_de(new.legenda), public.obras_obra_de(new.descricao), public.obras_obra_de(new.loja),
      (select r.obra_id from public.obras_remetentes r where r.nome = new.responsavel and r.obra_id is not null and r.ativo limit 1),
      (select o.id from public.obras o where o.codigo = case when new.responsavel ilike 'jhony%' then 'PETROLINA'
                                                             when new.responsavel ilike 'josemar%' then 'MCZ-CENTRO' end));
  end if;
  return new;
end $function$;
