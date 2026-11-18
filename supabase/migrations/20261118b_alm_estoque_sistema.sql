-- Estoque do almoxarifado também pelo relatório de estoque do sistema (CSV REPORTGROUP;CODIGO;DESCRICAO;
-- CORX;QUANTIDADE;PRECO;CUSTOAQUISICAO;REFERENCIA;ULTIMACOMPRA;...), o mesmo formato do Estoque TI.
-- Usado pela Central de Upload (patch almox-ax-verba-patch.js) para "ESTOQUE AX.CSV".
-- linhas: [{cod, desc, qtde, custo, ultcompra}] já convertidas no navegador (números pt-BR → número).
-- Recusa arquivo que é o estoque de TI (mesmos códigos do dbEstoqueTI) — regra 7 do CLAUDE.md.
create or replace function public.alm_carregar_estoque_sistema(linhas jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare p jsonb; novo jsonb; n int; v numeric; sem int; nti int; ncod int;
begin
  if jsonb_typeof(linhas) <> 'array' or jsonb_array_length(linhas) = 0 then raise exception 'Arquivo de estoque vazio.'; end if;
  select payload into p from portal_sync where module_id = 'alm' for update;
  if p is null then raise exception 'Módulo Almoxarifado não encontrado (sem acesso?).'; end if;

  select count(distinct ltrim(x->>'cod','0')),
         count(distinct ltrim(x->>'cod','0')) filter (where exists (
           select 1 from jsonb_array_elements(coalesce(p->'dbEstoqueTI','[]'::jsonb)) t where ltrim(t->>'Código','0') = ltrim(x->>'cod','0')))
    into ncod, nti from jsonb_array_elements(linhas) x;
  if ncod > 0 and nti >= 0.5 * ncod then
    raise exception 'Este arquivo é o estoque de TI (% de % códigos iguais ao Estoque TI) — não foi gravado como estoque do almoxarifado.', nti, ncod;
  end if;

  with l as (
    select ltrim(btrim(x->>'cod'),'0') cod, btrim(regexp_replace(coalesce(x->>'desc',''),'\s+',' ','g')) descr,
           coalesce(nullif(x->>'qtde','')::numeric,0) qtde, nullif(x->>'custo','')::numeric custo,
           nullif(btrim(coalesce(x->>'ultcompra','')),'') ultcompra
    from jsonb_array_elements(linhas) x where coalesce(ltrim(btrim(x->>'cod'),'0'),'') <> ''
  ), a as (
    select cod, max(descr) descr, sum(qtde) qtde, max(custo) filter (where custo > 0) custo,
           max(ultcompra) filter (where ultcompra ~ '^\d{2}/\d{2}/\d{4}$') ultcompra
    from l group by cod
  ), ant as (
    select distinct on (ltrim(e->>'Código','0')) ltrim(e->>'Código','0') cod, nullif(e->>'Custo Unitário','')::numeric custo,
           e->>'Unidade' un, e->>'Últ. Movimentação' mov, e->>'Última Compra' ultcompra
    from jsonb_array_elements(coalesce(p->'dbEstoqueRaw','[]'::jsonb)) e
    order by ltrim(e->>'Código','0'), (nullif(e->>'Custo Unitário','')::numeric > 0) desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'Código', a.cod, 'Insumo', a.descr, 'Unidade', coalesce(ant.un,''), 'Estoque Atual', a.qtde,
    'Última Compra', coalesce(a.ultcompra, ant.ultcompra, ''),
    'Custo Unitário', coalesce(a.custo, nullif(ant.custo,0), 0),
    'Últ. Movimentação', coalesce(ant.mov,'')) order by a.descr), '[]'::jsonb)
  into novo from a left join ant on ant.cod = a.cod where a.qtde <> 0;

  n := jsonb_array_length(novo);
  if n = 0 then raise exception 'Nenhum item com quantidade no arquivo de estoque.'; end if;
  update portal_sync set payload = jsonb_set(payload, '{dbEstoqueRaw}', novo, true), updated_at = now() where module_id = 'alm';
  select sum((e->>'Estoque Atual')::numeric * (e->>'Custo Unitário')::numeric), count(*) filter (where (e->>'Custo Unitário')::numeric = 0)
    into v, sem from jsonb_array_elements(novo) e;
  return jsonb_build_object('itens', n, 'valor', round(coalesce(v,0),2), 'sem_custo', sem, 'estoque', novo);
end $$;
revoke all on function public.alm_carregar_estoque_sistema(jsonb) from public, anon;
grant execute on function public.alm_carregar_estoque_sistema(jsonb) to authenticated;
