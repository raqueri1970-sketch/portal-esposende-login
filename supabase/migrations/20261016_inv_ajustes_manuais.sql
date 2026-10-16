-- Aplicado em 16/10/2026 (projeto "sistema de auditoria").
--
-- Sistema de Inventário: arquivo de Ajustes de Estoque manuais (Ajuste Expresso) por auditoria.
-- Uma linha por auditoria (inventario_id = inv_inventarios.id); itens = linhas do arquivo.
-- Usado por inventario-ajustes-patch.js (cache local sia_ajman_<id>).

create table if not exists public.inv_ajustes_manuais (
  inventario_id text primary key,
  arquivo_nome text,
  itens jsonb not null default '[]'::jsonb,
  importado_em timestamptz not null default now(),
  tenant_id text not null default 'esposende'
);
alter table public.inv_ajustes_manuais enable row level security;
create policy inv_ajustes_manuais_staff_all on public.inv_ajustes_manuais
  for all to authenticated
  using ((select portal_is_staff())) with check ((select portal_is_staff()));
revoke all on public.inv_ajustes_manuais from anon;
