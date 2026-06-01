-- RF-10: agrupación de incidentes.
-- Ejecutar en Supabase SQL Editor antes de usar el módulo de agrupación.
-- Este script es idempotente: se puede ejecutar más de una vez sin duplicar triggers principales.

-- 1) Tabla de grupos de incidentes
create table if not exists public.incident_groups (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  status text not null default 'reportado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_incident_groups_status on public.incident_groups (status);
create index if not exists idx_incident_groups_created_at on public.incident_groups (created_at desc);

-- 2) Asegurar la columna grupo_id en incidents
alter table public.incidents
  add column if not exists grupo_id uuid;

-- 3) Limpiar referencias huérfanas antes de crear la clave foránea.
-- Esto evita el error 23503 cuando ya hay incidentes con grupo_id que no existe
-- en public.incident_groups por una ejecución anterior incompleta.
update public.incidents i
set grupo_id = null
where i.grupo_id is not null
  and not exists (
    select 1
    from public.incident_groups g
    where g.id = i.grupo_id
  );

-- 4) Agregar la clave foránea solo si todavía no existe
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fk_incidents_incident_groups'
  ) then
    alter table public.incidents
      add constraint fk_incidents_incident_groups
      foreign key (grupo_id) references public.incident_groups(id) on delete set null;
  end if;
end;
$$;

create index if not exists idx_incidents_grupo_id on public.incidents (grupo_id);

-- 5) Trigger de timestamps para incident_groups
create or replace function public.set_incident_groups_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_incident_groups_updated_at on public.incident_groups;

create trigger set_incident_groups_updated_at
before update on public.incident_groups
for each row
execute procedure public.set_incident_groups_updated_at();

-- 7) Función RPC para crear un grupo y asociar incidentes.
-- IMPORTANTE: el nombre y los parámetros deben coincidir con el frontend:
-- _title, _description, _status, _incident_ids.
create or replace function public.create_incident_groups_with_incidents(
  _title text,
  _description text,
  _status text,
  _incident_ids uuid[]
)
returns public.incident_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group public.incident_groups%rowtype;
begin
  if _incident_ids is null or array_length(_incident_ids, 1) is null or array_length(_incident_ids, 1) < 2 then
    raise exception 'Debe seleccionar al menos dos incidentes para agrupar.';
  end if;

  insert into public.incident_groups (title, description, status)
  values (
    nullif(trim(coalesce(_title, '')), ''),
    nullif(trim(coalesce(_description, '')), ''),
    coalesce(nullif(trim(_status), ''), 'reportado')
  )
  returning * into new_group;

  update public.incidents
  set grupo_id = new_group.id,
      estado = coalesce(nullif(trim(_status), ''), 'reportado')
  where id = any(_incident_ids);

  return new_group;
end;
$$;

-- 7) Función RPC para actualizar el estado del grupo y sincronizar incidentes asociados
create or replace function public.update_incident_groups_status(
  _group_id uuid,
  _status text
)
returns public.incident_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_group public.incident_groups%rowtype;
begin
  update public.incident_groups
  set status = coalesce(nullif(trim(_status), ''), status)
  where id = _group_id
  returning * into updated_group;

  if updated_group.id is null then
    raise exception 'No se encontró el grupo de incidentes indicado.';
  end if;

  update public.incidents
  set estado = updated_group.status
  where grupo_id = _group_id;

  return updated_group;
end;
$$;

-- 8) Trigger para notificar a usuarios cuando cambia el estado de un grupo
create or replace function public.handle_group_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (user_id, title, message, type, metadata)
    select
      i.usuario_id,
      format('Estado de grupo actualizado: %s', coalesce(new.title, 'Grupo sin nombre')),
      format('El grupo de incidentes "%s" cambió a %s. Tu incidente se actualizó automáticamente.', coalesce(new.title, 'Grupo sin nombre'), new.status),
      'group_created',
      jsonb_build_object('group_id', new.id, 'from_status', old.status, 'to_status', new.status)
    from public.incidents i
    where i.grupo_id = new.id
      and i.usuario_id is not null;
  end if;

  return new;
end;
$$;

drop trigger if exists notify_users_on_group_status_change on public.incident_groups;

create trigger notify_users_on_group_status_change
after update on public.incident_groups
for each row
when (old.status is distinct from new.status)
execute procedure public.handle_group_status_change();

-- 9) RLS y políticas para incident_groups
alter table public.incident_groups enable row level security;

drop policy if exists "incident_groups_select_admin" on public.incident_groups;
drop policy if exists "incident_groups_select_user" on public.incident_groups;
drop policy if exists "incident_groups_insert_admin" on public.incident_groups;
drop policy if exists "incident_groups_update_admin" on public.incident_groups;
drop policy if exists "incident_groups_delete_admin" on public.incident_groups;

create policy "incident_groups_select_admin" on public.incident_groups
for select using (
  exists (select 1 from auth.users where id = auth.uid() and raw_user_meta_data->>'role' = 'admin')
  or exists (select 1 from public.profiles where id = auth.uid() and rol = 'admin')
);

create policy "incident_groups_select_user" on public.incident_groups
for select using (
  exists (
    select 1 from public.incidents
    where public.incidents.grupo_id = public.incident_groups.id
      and public.incidents.usuario_id = auth.uid()
  )
);

create policy "incident_groups_insert_admin" on public.incident_groups
for insert with check (
  exists (select 1 from auth.users where id = auth.uid() and raw_user_meta_data->>'role' = 'admin')
  or exists (select 1 from public.profiles where id = auth.uid() and rol = 'admin')
);

create policy "incident_groups_update_admin" on public.incident_groups
for update using (
  exists (select 1 from auth.users where id = auth.uid() and raw_user_meta_data->>'role' = 'admin')
  or exists (select 1 from public.profiles where id = auth.uid() and rol = 'admin')
) with check (
  exists (select 1 from auth.users where id = auth.uid() and raw_user_meta_data->>'role' = 'admin')
  or exists (select 1 from public.profiles where id = auth.uid() and rol = 'admin')
);

create policy "incident_groups_delete_admin" on public.incident_groups
for delete using (
  exists (select 1 from auth.users where id = auth.uid() and raw_user_meta_data->>'role' = 'admin')
  or exists (select 1 from public.profiles where id = auth.uid() and rol = 'admin')
);

-- 10) Recargar cache de PostgREST/Supabase para que el RPC aparezca inmediatamente
select pg_notify('pgrst', 'reload schema');
