-- NF-e Canceladas: trava contra gravações erradas na nuvem (portal_sync, module_id = 'nf').
--
-- Investigação (05/11/2026): o navegador de quem já carregou arquivos guarda esses arquivos e,
-- ao abrir o módulo, reprocessa e grava de novo na nuvem. Assim:
--   * 04/11 11:46:47  voltaram as 721 notas antigas (CANCELADA JUN - SET.CSV);
--   * 04/11 11:46:52  5 s depois, 67 "notas" que eram o arquivo de VENDAS lido como canceladas
--                     (1 linha por loja, sem código/usuário/vendedor, R$ 313,8 milhões);
--                     a nuvem ficou com isso até 05/11;
--   * 05/11 11:17:55  de novo as 721 antigas, e só às 11:18:32 a carga nova (1.818).
-- Gravações feitas pela conta roberto.santos@lojasesposende.com.br (repetição automática do
-- cache do navegador, não ação manual).
--
-- A trava recusa (mantém o que está na nuvem e registra em portal_sync_bloqueios):
--   1) arquivo de vendas no lugar de canceladas (metade ou mais das notas sem código, ou nota acima de R$ 100 mil);
--   2) volta de uma versão antiga já substituída (mesmas notas de uma versão do histórico);
--   3) encolhimento brusco (menos de 10 notas quando a nuvem tem 100 ou mais).

create table if not exists public.portal_sync_bloqueios (
  id bigint generated always as identity primary key,
  module_id text not null,
  tenant_id text,
  motivo text not null,
  usuario text,
  n_novo integer,
  n_atual integer,
  soma_nova numeric,
  payload jsonb,
  criado_em timestamptz not null default now()
);
alter table public.portal_sync_bloqueios enable row level security;
drop policy if exists portal_sync_bloqueios_staff_select on public.portal_sync_bloqueios;
create policy portal_sync_bloqueios_staff_select on public.portal_sync_bloqueios
  for select to authenticated using ((select public.portal_is_staff()));

create or replace function portal_private.portal_sync_nf_trava()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  n_novo int; n_atual int; sem_codigo int; maior numeric; soma numeric;
  h_novo text; h_atual text; motivo text; quem text;
begin
  if new.module_id <> 'nf' or new.payload is null or jsonb_typeof(new.payload->'registros') <> 'array' then
    return new;
  end if;
  n_novo := jsonb_array_length(new.payload->'registros');
  n_atual := case when jsonb_typeof(old.payload->'registros') = 'array' then jsonb_array_length(old.payload->'registros') else 0 end;
  select count(*) filter (where coalesce(trim(r->>'codigo'),'') = ''),
         max(case when (r->>'total') ~ '^-?[0-9.]+$' then (r->>'total')::numeric end),
         sum(case when (r->>'total') ~ '^-?[0-9.]+$' then (r->>'total')::numeric else 0 end)
    into sem_codigo, maior, soma
    from jsonb_array_elements(new.payload->'registros') r;

  if n_novo > 0 and (sem_codigo * 2 >= n_novo or coalesce(maior,0) > 100000) then
    motivo := 'arquivo de vendas no lugar de canceladas (notas sem código ou valor acima de R$ 100 mil)';
  elsif n_atual >= 100 and n_novo < 10 then
    motivo := 'encolhimento brusco: ' || n_novo || ' notas contra ' || n_atual || ' na nuvem';
  else
    h_novo := md5((new.payload->'registros')::text);
    h_atual := md5(coalesce(old.payload->'registros','null'::jsonb)::text);
    if h_novo <> h_atual and exists (
         select 1 from public.portal_sync_historico h
          where h.module_id = 'nf'
            and coalesce(h.tenant_id, new.tenant_id) = new.tenant_id
            and md5(coalesce(h.payload->'registros','null'::jsonb)::text) = h_novo) then
      motivo := 'versão antiga já substituída (' || n_novo || ' notas) tentando voltar para a nuvem';
    end if;
  end if;

  if motivo is null then return new; end if;

  begin
    quem := coalesce((select u.email from auth.users u where u.id = auth.uid()), auth.uid()::text, current_user);
  exception when others then quem := current_user; end;
  insert into public.portal_sync_bloqueios(module_id, tenant_id, motivo, usuario, n_novo, n_atual, soma_nova, payload)
  values (new.module_id, new.tenant_id, motivo, quem, n_novo, n_atual, soma, new.payload);
  return null; -- mantém a versão que está na nuvem
end $$;

revoke all on function portal_private.portal_sync_nf_trava() from public, anon, authenticated;

drop trigger if exists a0_portal_sync_nf_trava on public.portal_sync;
create trigger a0_portal_sync_nf_trava
  before update on public.portal_sync
  for each row when (new.module_id = 'nf')
  execute function portal_private.portal_sync_nf_trava();

-- ── Registro de cada envio à nuvem (todos os módulos), mesmo quando o conteúdo chega igual ──
-- Antes, um envio idêntico era descartado sem deixar rastro e a tela parecia "não atualizou"
-- (ex.: Remanejo em 05/11, mesmos arquivos de 04/11). O portal mostra estes dados no topo de cada módulo.
create table if not exists public.portal_sync_envios (
  tenant_id text not null,
  module_id text not null,
  ultimo_envio timestamptz not null default now(),
  usuario text,
  bytes integer,
  primary key (tenant_id, module_id)
);
alter table public.portal_sync_envios enable row level security;
drop policy if exists portal_sync_envios_staff_select on public.portal_sync_envios;
create policy portal_sync_envios_staff_select on public.portal_sync_envios
  for select to authenticated using ((select public.portal_is_staff()));

create or replace function portal_private.portal_sync_registra_envio()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare quem text;
begin
  begin
    quem := (select u.email from auth.users u where u.id = auth.uid());
  exception when others then quem := null; end;
  if quem is null then
    -- robôs/rotinas automáticas (sem login) não contam como envio de arquivo
    return new;
  end if;
  insert into public.portal_sync_envios(tenant_id, module_id, ultimo_envio, usuario, bytes)
  values (coalesce(new.tenant_id,'esposende'), new.module_id, now(), quem, octet_length(coalesce(new.payload::text,'')))
  on conflict (tenant_id, module_id) do update
    set ultimo_envio = excluded.ultimo_envio, usuario = excluded.usuario, bytes = excluded.bytes;
  return new;
end $$;
revoke all on function portal_private.portal_sync_registra_envio() from public, anon, authenticated;

drop trigger if exists "0_portal_sync_registra_envio" on public.portal_sync;
create trigger "0_portal_sync_registra_envio"
  before insert or update on public.portal_sync
  for each row execute function portal_private.portal_sync_registra_envio();

-- Leitura única para o painel de atualização (data da nuvem + último envio + quem).
create or replace function public.portal_status_atualizacoes()
returns table(module_id text, dados_em timestamptz, ultimo_envio timestamptz, usuario text)
language sql
stable
security definer
set search_path to ''
as $$
  select s.module_id, s.updated_at, e.ultimo_envio, e.usuario
    from public.portal_sync s
    left join public.portal_sync_envios e on e.tenant_id = s.tenant_id and e.module_id = s.module_id
   where (select public.portal_is_staff())
$$;
revoke all on function public.portal_status_atualizacoes() from public, anon;
grant execute on function public.portal_status_atualizacoes() to authenticated;
