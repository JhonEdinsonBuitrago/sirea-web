-- Schema de notificaciones profesional para Supabase + PostgreSQL

create type if not exists public.notification_type as enum (
  'new_incident',
  'incident_updated',
  'incident_resolved',
  'duplicate_detected',
  'incident_stalled',
  'group_created'
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type public.notification_type not null,
  read boolean not null default false,
  incident_id uuid references public.incidents(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id_created_at on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_user_id_read on public.notifications (user_id, read);
create index if not exists idx_notifications_incident_id on public.notifications (incident_id);

create or replace function public.set_notification_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_notification_updated_at
before update on public.notifications
for each row
execute procedure public.set_notification_updated_at();

create or replace function public.create_notification(
  _user_id uuid,
  _title text,
  _message text,
  _type public.notification_type,
  _incident_id uuid default null,
  _metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.notifications (user_id, title, message, type, incident_id, metadata)
  values (_user_id, coalesce(_title, ''), coalesce(_message, ''), _type, _incident_id, coalesce(_metadata, '{}'::jsonb));
end;
$$;

create or replace function public.mark_notification_as_read(
  notification_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update public.notifications
  set read = true, updated_at = now()
  where id = notification_id
    and user_id = auth.uid();
end;
$$;

create or replace function public.mark_all_notifications_as_read(
  current_user uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update public.notifications
  set read = true, updated_at = now()
  where user_id = current_user
    and read = false;
end;
$$;

create or replace function public.handle_incident_insert()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.notifications (user_id, title, message, type, incident_id, metadata)
  select
    p.id,
    'Nuevo incidente reportado',
    format('Se ha creado un nuevo incidente: %s. Revísalo y asigna recursos.', coalesce(new.titulo, 'Incidente sin título')),
    'new_incident',
    new.id,
    jsonb_build_object('incident_type', new.tipo, 'reported_by', new.usuario_id)
  from public.profiles p
  where p.rol = 'admin';

  return new;
end;
$$;

create or replace function public.handle_incident_status_change()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.estado = old.estado then
    return new;
  end if;

  if new.usuario_id is null then
    return new;
  end if;

  if new.estado = 'resuelto' then
    perform public.create_notification(
      new.usuario_id,
      'Incidente resuelto',
      format('El estado de tu incidente "%s" cambió a resuelto.', coalesce(new.titulo, 'sin título')),
      'incident_resolved',
      new.id,
      jsonb_build_object('from_state', old.estado, 'to_state', new.estado)
    );
  else
    perform public.create_notification(
      new.usuario_id,
      'Estado del incidente actualizado',
      format('El estado de tu incidente "%s" cambió de %s a %s.', coalesce(new.titulo, 'sin título'), old.estado, new.estado),
      'incident_updated',
      new.id,
      jsonb_build_object('from_state', old.estado, 'to_state', new.estado)
    );
  end if;

  return new;
end;
$$;

create trigger notify_admins_on_incident_insert
after insert on public.incidents
for each row
execute procedure public.handle_incident_insert();

create trigger notify_owner_on_incident_status_change
after update on public.incidents
for each row
when (old.estado is distinct from new.estado)
execute procedure public.handle_incident_status_change();

create or replace function public.notify_stalled_incidents(
  threshold_days integer default 7
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.notifications (user_id, title, message, type, incident_id, metadata)
  select
    p.id,
    'Incidente sin avance',
    format('El incidente "%s" lleva más de %s días sin cambios. Por favor revisa su estado.', coalesce(i.titulo, 'sin título'), threshold_days),
    'incident_stalled',
    i.id,
    jsonb_build_object('threshold_days', threshold_days, 'last_update', i.updated_at)
  from public.incidents i
  cross join public.profiles p
  where p.rol = 'admin'
    and i.estado != 'resuelto'
    and i.updated_at <= now() - (threshold_days || ' days')::interval
    and not exists (
      select 1
      from public.notifications n
      where n.incident_id = i.id
        and n.user_id = p.id
        and n.type = 'incident_stalled'
        and n.created_at >= now() - (threshold_days || ' days')::interval
    );
end;
$$;
