-- Quem pode VER o portal completo (leitura do arquivo no bucket portal-file).
-- Gravar/apagar continua restrito a portal_is_staff() (administrador, comprador).
create or replace function public.portal_pode_ver()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists(select 1 from public.orc_perfis p
                where p.user_id = (select auth.uid()) and p.ativo
                  and p.perfil in ('administrador','comprador','gestor_compras','controladoria','diretoria'))
$$;
revoke all on function public.portal_pode_ver() from public, anon;
grant execute on function public.portal_pode_ver() to authenticated;

drop policy if exists portal_file_staff_read on storage.objects;
create policy portal_file_staff_read on storage.objects
  for select to authenticated
  using (bucket_id = 'portal-file' and (select public.portal_pode_ver()));
