-- Estoque do almoxarifado a partir da planilha WMS do AX (Estoque_AX.xlsx).
-- Até aqui o Portal não sabia ler esse arquivo: carregado em "Carregar Planilhas" ele virava
-- REQUISIÇÕES (447 linhas de "AX" em 18/11/2026 11:49) ou não gerava nada no campo do estoque
-- (e o gatilho preserva_bases mantinha o estoque antigo) — por isso "carrego e não atualiza".
--
-- public.alm_estoque_ax_montar(linhas, payload): converte as linhas do WMS no formato do
--   dbEstoqueRaw. Código do item = Cod. Produto ÷ 100 (2 últimos dígitos = grade). Soma os endereços.
--   Custo unitário: o do estoque anterior; sem ele, o da última requisição atendida com custo; senão 0.
-- public.alm_carregar_estoque_ax(linhas): grava no portal_sync alm (chamado pelo patch do Portal).
-- Gatilho a1: se dbConsumoRaw chegar com a cara do AX (todas as linhas Empresa = AX e sem data),
--   mantém as requisições antigas e grava o arquivo como estoque.

create or replace function public.alm_estoque_ax_montar(linhas jsonb, payload jsonb)
returns jsonb language sql stable set search_path = public as $$
with l as (
  select (floor(nullif(regexp_replace(coalesce(x->>'cod',''),'[^0-9]','','g'),'')::numeric / 100))::bigint::text as cod,
         btrim(regexp_replace(coalesce(x->>'desc',''),'\s+',' ','g')) as descr,
         coalesce(nullif(x->>'qtde','')::numeric,0) as qtde,
         nullif(x->>'mov','')::timestamp as mov
  from jsonb_array_elements(coalesce(linhas,'[]'::jsonb)) x
), a as (
  select cod, max(descr) descr, sum(qtde) qtde, max(mov) mov from l where cod is not null and cod <> '0' group by cod
), ant as (
  select distinct on (ltrim(e->>'Código','0')) ltrim(e->>'Código','0') cod,
         nullif(e->>'Custo Unitário','')::numeric custo, e->>'Última Compra' ultcompra, e->>'Unidade' un
  from jsonb_array_elements(coalesce(payload->'dbEstoqueRaw','[]'::jsonb)) e
  order by ltrim(e->>'Código','0'), (nullif(e->>'Custo Unitário','')::numeric > 0) desc
), req as (
  select distinct on (ltrim(r->>'Código','0')) ltrim(r->>'Código','0') cod,
         round((r->>'Custo Atendido')::numeric / nullif((r->>'Qtd Atendida')::numeric,0), 4) custo
  from jsonb_array_elements(coalesce(payload->'dbConsumoRaw','[]'::jsonb)) r
  where coalesce((r->>'Qtd Atendida')::numeric,0) > 0 and coalesce((r->>'Custo Atendido')::numeric,0) > 0
  order by ltrim(r->>'Código','0'), r->>'Data Solicitação' desc nulls last
)
select coalesce(jsonb_agg(jsonb_build_object(
  'Código', a.cod,
  'Insumo', a.descr,
  'Unidade', coalesce(ant.un,''),
  'Estoque Atual', a.qtde,
  'Última Compra', coalesce(ant.ultcompra,''),
  'Custo Unitário', coalesce(nullif(ant.custo,0), req.custo, 0),
  'Últ. Movimentação', coalesce(to_char(a.mov,'DD/MM/YYYY'),'')
) order by a.descr), '[]'::jsonb)
from a left join ant on ant.cod = a.cod left join req on req.cod = a.cod
where a.qtde <> 0;
$$;

create or replace function public.alm_carregar_estoque_ax(linhas jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare p jsonb; novo jsonb; n int; v numeric; sem int;
begin
  if jsonb_typeof(linhas) <> 'array' or jsonb_array_length(linhas) = 0 then
    raise exception 'Planilha do AX vazia.';
  end if;
  select payload into p from portal_sync where module_id = 'alm' for update;
  if p is null then raise exception 'Módulo Almoxarifado não encontrado (sem acesso?).'; end if;
  novo := alm_estoque_ax_montar(linhas, p);
  n := jsonb_array_length(novo);
  if n = 0 then raise exception 'Nenhum item com quantidade na planilha do AX.'; end if;
  update portal_sync set payload = jsonb_set(payload, '{dbEstoqueRaw}', novo, true), updated_at = now()
   where module_id = 'alm';
  select sum((e->>'Estoque Atual')::numeric * (e->>'Custo Unitário')::numeric),
         count(*) filter (where (e->>'Custo Unitário')::numeric = 0)
    into v, sem from jsonb_array_elements(novo) e;
  return jsonb_build_object('itens', n, 'valor', round(coalesce(v,0),2), 'sem_custo', sem, 'estoque', novo);
end $$;
revoke all on function public.alm_carregar_estoque_ax(jsonb) from public, anon;
grant execute on function public.alm_carregar_estoque_ax(jsonb) to authenticated;
revoke all on function public.alm_estoque_ax_montar(jsonb, jsonb) from public, anon;
grant execute on function public.alm_estoque_ax_montar(jsonb, jsonb) to authenticated;

-- Rede de segurança: AX carregado no campo das requisições.
create or replace function public.portal_sync_alm_ax_no_consumo()
returns trigger language plpgsql set search_path = public as $$
declare c jsonb; linhas jsonb;
begin
  if new.module_id <> 'alm' or old.payload is null then return new; end if;
  c := new.payload->'dbConsumoRaw';
  if jsonb_typeof(c) <> 'array' or jsonb_array_length(c) = 0 then return new; end if;
  if exists (select 1 from jsonb_array_elements(c) r
             where upper(btrim(coalesce(r->>'Empresa Solicitante',''))) <> 'AX' or nullif(r->>'Data Solicitação','') is not null) then
    return new;
  end if;
  select jsonb_agg(jsonb_build_object('cod', r->>'Código', 'desc', r->>'Insumo', 'qtde', coalesce(r->>'Qtd Atendida', r->>'Qtd Solicitada'), 'mov', null))
    into linhas from jsonb_array_elements(c) r;
  new.payload := jsonb_set(new.payload, '{dbConsumoRaw}', coalesce(old.payload->'dbConsumoRaw','[]'::jsonb), true);
  new.payload := jsonb_set(new.payload, '{dbEstoqueRaw}', alm_estoque_ax_montar(linhas, old.payload), true);
  raise warning 'Almoxarifado: planilha do AX chegou como requisições; gravada como estoque.';
  return new;
end $$;
drop trigger if exists a1_portal_sync_alm_ax_no_consumo on public.portal_sync;
create trigger a1_portal_sync_alm_ax_no_consumo before update on public.portal_sync
  for each row execute function public.portal_sync_alm_ax_no_consumo();
