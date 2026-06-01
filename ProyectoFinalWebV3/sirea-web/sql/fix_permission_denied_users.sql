-- Fix: permission denied for table users
-- Motivo: algunas políticas RLS consultaban directamente auth.users.
-- Los usuarios autenticados no tienen permisos para leer auth.users desde políticas normales.
-- Solución: usar una función SECURITY DEFINER que valida el rol desde public.profiles.

-- 1) Función segura para validar administradores desde public.profiles.
create or replace function public.is_current_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(trim(coalesce(p.rol, ''))) = 'admin'
  );
$$;

grant execute on function public.is_current_admin() to authenticated;

-- 2) Limpiar políticas antiguas de profiles que podían consultar auth.users.
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_select_admin"
on public.profiles
for select
to authenticated
using (public.is_current_admin());

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- 3) Limpiar políticas antiguas de incidents que podían consultar auth.users.
drop policy if exists "incidents_select_user" on public.incidents;
drop policy if exists "incidents_select_admin" on public.incidents;
drop policy if exists "incidents_insert" on public.incidents;
drop policy if exists "incidents_update_user" on public.incidents;
drop policy if exists "incidents_update_admin" on public.incidents;
drop policy if exists "incidents_insert_admin" on public.incidents;
drop policy if exists "incidents_delete_admin" on public.incidents;

alter table public.incidents enable row level security;

create policy "incidents_select_user"
on public.incidents
for select
to authenticated
using (usuario_id = auth.uid());

create policy "incidents_select_admin"
on public.incidents
for select
to authenticated
using (public.is_current_admin());

create policy "incidents_insert_user"
on public.incidents
for insert
to authenticated
with check (usuario_id = auth.uid());

create policy "incidents_update_user"
on public.incidents
for update
to authenticated
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

create policy "incidents_update_admin"
on public.incidents
for update
to authenticated
using (public.is_current_admin())
with check (public.is_current_admin());

create policy "incidents_delete_admin"
on public.incidents
for delete
to authenticated
using (public.is_current_admin());

-- 4) Storage: corregir políticas del bucket reports que usaban auth.users para validar admin.
-- Si alguna policy no existe, el DROP simplemente no hace nada.
drop policy if exists "reports_insert_authenticated" on storage.objects;
drop policy if exists "reports_select_public" on storage.objects;
drop policy if exists "reports_delete_owner_or_admin" on storage.objects;
drop policy if exists "reports_update_owner_or_admin" on storage.objects;

create policy "reports_insert_authenticated"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'reports'
  and auth.role() = 'authenticated'
  and (
    lower(coalesce(metadata->>'content-type','')) like '%png%'
    or lower(coalesce(metadata->>'content-type','')) like '%jpeg%'
    or lower(coalesce(metadata->>'content-type','')) like '%jpg%'
    or lower(coalesce(metadata->>'content-type','')) like '%webp%'
  )
);

create policy "reports_select_public"
on storage.objects
for select
to public
using (bucket_id = 'reports');

create policy "reports_delete_owner_or_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'reports'
  and (
    metadata->>'owner' = auth.uid()::text
    or public.is_current_admin()
  )
);

create policy "reports_update_owner_or_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'reports'
  and (
    metadata->>'owner' = auth.uid()::text
    or public.is_current_admin()
  )
)
with check (
  bucket_id = 'reports'
  and (
    metadata->>'owner' = auth.uid()::text
    or public.is_current_admin()
  )
);

-- 5) Recargar cache de Supabase/PostgREST.
select pg_notify('pgrst', 'reload schema');
