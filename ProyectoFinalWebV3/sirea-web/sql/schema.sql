-- SQL: Tablas, triggers y RLS para "Sistema de Reporte de Incidentes"

-- 1) Tabla profiles
create table if not exists public.profiles (
  id uuid primary key,
  nombre text,
  email text unique,
  rol text default 'usuario',
  created_at timestamptz default now()
);

-- 2) Tabla incidents
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.profiles(id) on delete cascade,
  titulo text,
  tipo text,
  descripcion text,
  imagen_url text,
  ubicacion_texto text,
  salon text,
  latitud double precision,
  longitud double precision,
  estado text default 'reportado',
  grupo_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3) Función trigger para insertar/actualizar profiles desde auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    -- extraer nombre y rol desde raw_user_meta_data si está disponible
    insert into public.profiles (id, email, nombre, rol)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'nombre', new.email),
      coalesce(new.raw_user_meta_data->>'role', 'usuario')
    )
    on conflict (id) do nothing;
    return new;
  elsif (tg_op = 'UPDATE') then
    update public.profiles set email = new.email where id = new.id;
    return new;
  end if;
  return null;
end;
$$;

-- 4) Trigger on auth.users (supabase uses auth schema)
-- Note: to attach trigger to auth.users, run from Supabase SQL editor with proper search_path
create trigger on_auth_user_change
after insert or update on auth.users
for each row
execute procedure public.handle_new_user();

-- 5) RLS: habilitar row level security en profiles e incidents
alter table public.profiles enable row level security;
alter table public.incidents enable row level security;

-- 6) Policies profiles
-- Usuarios pueden seleccionar su propio perfil
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

-- Admins pueden seleccionar cualquier perfil
create policy "profiles_select_admin" on public.profiles
for select using (exists (select 1 from auth.users where id = auth.uid() and raw_user_meta_data->>'role' = 'admin'));

-- Insert: permitir insert cuando auth.uid() = id
create policy "profiles_insert" on public.profiles
for insert with check (auth.uid() = id);

-- Update: permitir a usuario actualizar su perfil
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

-- 7) Policies incidents
-- Lectura: usuarios ven solo sus incidentes; admin ve todos
create policy "incidents_select_user" on public.incidents
for select using (usuario_id = auth.uid());

create policy "incidents_select_admin" on public.incidents
for select using (exists (select 1 from auth.users where id = auth.uid() and raw_user_meta_data->>'role' = 'admin'));

-- Insert: permitir crear incidentes si usuario_id = auth.uid()
create policy "incidents_insert" on public.incidents
for insert with check (usuario_id = auth.uid());

-- Update: permitir usuario actualizar solo ciertos campos de sus incidentes (por ejemplo descripcion antes de que admin lo cierre)
create policy "incidents_update_user" on public.incidents
for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- Admin update: permitir admin actualizar cualquier incidente
create policy "incidents_update_admin" on public.incidents
for update using (exists (select 1 from auth.users where id = auth.uid() and raw_user_meta_data->>'role' = 'admin'));

-- 8) Storage policies: el bucket "reports" debe crearse en Supabase console.
-- A continuación se sugieren políticas para storage (ejecutar en SQL del proyecto si se permite):
-- Storage: políticas para el bucket 'reports'
-- Estas políticas aplican sobre la tabla storage.objects

-- 1) Permitir que usuarios autenticados suban objetos al bucket 'reports'
create policy "reports_insert_authenticated" on storage.objects
for insert with check (
  auth.role() = 'authenticated' and
  bucket_id = 'reports' and
  -- validar tipos comunes en metadata.content_type
  ( lower(coalesce(metadata->>'content-type','')) like '%png%' or lower(coalesce(metadata->>'content-type','')) like '%jpeg%' or lower(coalesce(metadata->>'content-type','')) like '%webp%')
);

-- 2) Permitir lectura pública de objetos en 'reports' (si así se desea)
create policy "reports_select_public" on storage.objects
for select using (bucket_id = 'reports');

-- 3) Permitir eliminación/actualización sólo a administradores o al propio usuario (basado en metadata.owner)
create policy "reports_delete_owner_or_admin" on storage.objects
for delete using (
  bucket_id = 'reports' and (
    -- si metadata.owner coincide con uid
    (metadata->>'owner') = auth.uid() or exists (select 1 from auth.users where id = auth.uid() and raw_user_meta_data->>'role' = 'admin')
  )
);

create policy "reports_update_owner_or_admin" on storage.objects
for update using (
  bucket_id = 'reports' and (
    (metadata->>'owner') = auth.uid() or exists (select 1 from auth.users where id = auth.uid() and raw_user_meta_data->>'role' = 'admin')
  )
);

-- 9) Índices (opcional)
create index if not exists idx_incidents_usuario on public.incidents (usuario_id);
create index if not exists idx_incidents_estado on public.incidents (estado);
create index if not exists idx_incidents_tipo on public.incidents (tipo);

-- 10) Trigger para actualizar timestamp updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_incident_updated_at
before update on public.incidents
for each row
execute procedure public.set_updated_at();

-- FIN
