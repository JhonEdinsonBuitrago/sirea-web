-- FIX RF-10 / Panel Admin: permitir que los administradores vean y actualicen todos los incidentes.
-- Problema que corrige:
-- El frontend reconoce al usuario como admin por public.profiles.rol = 'admin',
-- pero algunas policies antiguas de public.incidents solo validaban auth.users.raw_user_meta_data->>'role'.
-- Resultado: el panel admin cargaba 0 incidentes aunque existieran registros en la tabla.

-- 1) Función auxiliar reutilizable para validar admin desde metadata o desde profiles.
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

-- 2) Rehacer policy de lectura admin para incidents.
drop policy if exists "incidents_select_admin" on public.incidents;

create policy "incidents_select_admin" on public.incidents
for select
using (public.is_current_admin());

-- 3) Rehacer policy de actualización admin para incidents.
-- Necesaria para agrupar incidentes y sincronizar estados desde el panel administrativo.
drop policy if exists "incidents_update_admin" on public.incidents;

create policy "incidents_update_admin" on public.incidents
for update
using (public.is_current_admin())
with check (public.is_current_admin());

-- 4) Asegurar que RLS siga activo.
alter table public.incidents enable row level security;

-- 5) Recargar caché de Supabase/PostgREST.
select pg_notify('pgrst', 'reload schema');

-- 6) Diagnóstico útil: debe mostrar true cuando lo ejecutas logueado como admin desde la app.
-- Nota: en el SQL Editor puede devolver null/false porque auth.uid() depende del contexto de sesión del cliente.
select public.is_current_admin() as current_user_is_admin;
