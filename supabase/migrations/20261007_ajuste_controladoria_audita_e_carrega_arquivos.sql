-- Acerto de Estoque Lojas: Controladoria (auditoria) abre o modulo, le tudo e carrega os arquivos.
-- Demais alteracoes (link, paineis, leitores, senhas, usuarios, robo, excluir cadastro) seguem so com Administrador.
-- Aplicada no Supabase em 2026-10-07 (duas migrations: esta + ajuste_entrada_insert_portal_is_admin).

create or replace function public.ajuste_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.orc_perfis p
                where p.user_id = (select auth.uid()) and p.ativo
                  and p.perfil in ('administrador','controladoria'))
$$;

do $$
declare f record;
begin
  -- Acoes que alteram dados (fora carga de arquivos): so Administrador.
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in (
              'ajuste_admin_aprovar_pareamento','ajuste_admin_conferir_produto','ajuste_admin_criar_leitor',
              'ajuste_admin_criar_painel','ajuste_admin_excluir_cadastro','ajuste_admin_revogar_painel',
              'ajuste_admin_set_leitor','ajuste_admin_set_link')
  loop
    execute regexp_replace(pg_get_functiondef(f.oid), '(public\.)?ajuste_is_admin\(\)', 'public.orc_is_admin()', 'g');
  end loop;

  -- Relatorios de auditoria e carga de arquivos (custos, saldo de estoque): Administrador ou Controladoria.
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in (
              'ajuste_admin_auditoria_cruzada','ajuste_admin_auditoria_relatorio','ajuste_admin_log','ajuste_admin_painel_robo',
              'ajuste_admin_custo_upsert','ajuste_admin_saldo_status','ajuste_admin_saldo_finalizar','ajuste_admin_saldo_descartar_lote')
  loop
    execute regexp_replace(pg_get_functiondef(f.oid), '(public\.)?orc_is_admin\(\)', 'public.ajuste_is_admin()', 'g');
  end loop;
end $$;

-- Criar pedido de ajuste fora da propria loja: so Administrador.
-- (portal_is_admin, e nao orc_is_admin, porque a policy roda como authenticated e orc_is_admin nao e executavel por ele)
alter policy ajuste_entrada_insert on public.ajuste_estoque_entrada
  with check ((( select auth.uid()) = user_id) and (operacao = 'ENTRADA')
              and (public.portal_is_admin() or public.ajuste_pode_solicitar(loja_normalizada)));
