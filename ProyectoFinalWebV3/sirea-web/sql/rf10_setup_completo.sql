-- RF-10 completo: agrupación + detección de duplicados inteligentes.
-- Ejecuta este archivo completo en Supabase SQL Editor.

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



-- 11) FIX RLS: permitir que administradores definidos en public.profiles puedan ver y actualizar incidentes.
-- El frontend usa public.profiles.rol = 'admin' para entrar al panel administrativo.
-- Sin esta policy, el panel puede mostrar 0 incidentes aunque sí existan registros en public.incidents.
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

drop policy if exists "incidents_select_admin" on public.incidents;
create policy "incidents_select_admin" on public.incidents
for select using (public.is_current_admin());

drop policy if exists "incidents_update_admin" on public.incidents;
create policy "incidents_update_admin" on public.incidents
for update using (public.is_current_admin()) with check (public.is_current_admin());

select pg_notify('pgrst', 'reload schema');

-- RF-10: detección automática de posibles incidentes duplicados.
-- Ejecutar este archivo en el SQL Editor de Supabase después de tener creadas las tablas:
-- public.profiles, public.incidents, public.notifications e incident_groups.

-- 1) Normaliza texto para comparar títulos, descripciones, ubicaciones y tipos.
create or replace function public.normalize_incident_text(_text text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(lower(coalesce(_text, '')), '[^a-z0-9áéíóúñü\s]', ' ', 'g'));
$$;

-- 2) Calcula un puntaje de similitud entre dos incidentes.
-- El puntaje suma criterios de negocio: tipo, salón, ubicación, coordenadas,
-- cercanía temporal y palabras clave compartidas.
create or replace function public.incident_duplicate_score(
  _left public.incidents,
  _right public.incidents
)
returns integer
language plpgsql
stable
as $$
declare
  score integer := 0;
  left_text text;
  right_text text;
  token_intersection integer := 0;
  token_union integer := 0;
  distance_degrees double precision;
begin
  if public.normalize_incident_text(_left.tipo) <> ''
     and public.normalize_incident_text(_left.tipo) = public.normalize_incident_text(_right.tipo) then
    score := score + 25;
  end if;

  if public.normalize_incident_text(_left.salon) <> ''
     and public.normalize_incident_text(_left.salon) = public.normalize_incident_text(_right.salon) then
    score := score + 18;
  end if;

  if public.normalize_incident_text(_left.ubicacion_texto) <> ''
     and public.normalize_incident_text(_left.ubicacion_texto) = public.normalize_incident_text(_right.ubicacion_texto) then
    score := score + 18;
  elsif public.normalize_incident_text(_left.ubicacion_texto) <> ''
     and public.normalize_incident_text(_right.ubicacion_texto) <> ''
     and (
       public.normalize_incident_text(_left.ubicacion_texto) like '%' || public.normalize_incident_text(_right.ubicacion_texto) || '%'
       or public.normalize_incident_text(_right.ubicacion_texto) like '%' || public.normalize_incident_text(_left.ubicacion_texto) || '%'
     ) then
    score := score + 10;
  end if;

  if _left.latitud is not null and _left.longitud is not null
     and _right.latitud is not null and _right.longitud is not null then
    distance_degrees := sqrt(power(_left.latitud - _right.latitud, 2) + power(_left.longitud - _right.longitud, 2));

    -- Aproximación simple: 0.0005 grados ≈ 55 metros, 0.0015 grados ≈ 165 metros.
    if distance_degrees <= 0.0005 then
      score := score + 22;
    elsif distance_degrees <= 0.0015 then
      score := score + 14;
    end if;
  end if;

  left_text := public.normalize_incident_text(concat_ws(' ', _left.titulo, _left.descripcion, _left.tipo, _left.ubicacion_texto, _left.salon));
  right_text := public.normalize_incident_text(concat_ws(' ', _right.titulo, _right.descripcion, _right.tipo, _right.ubicacion_texto, _right.salon));

  with left_tokens as (
    select distinct token
    from regexp_split_to_table(left_text, '\s+') as t(token)
    where length(token) > 3
      and token not in ('incidente', 'problema', 'reporte', 'para', 'como', 'donde', 'sobre', 'esta', 'este')
  ),
  right_tokens as (
    select distinct token
    from regexp_split_to_table(right_text, '\s+') as t(token)
    where length(token) > 3
      and token not in ('incidente', 'problema', 'reporte', 'para', 'como', 'donde', 'sobre', 'esta', 'este')
  )
  select count(*)
  into token_intersection
  from left_tokens
  inner join right_tokens using (token);

  with left_tokens as (
    select distinct token
    from regexp_split_to_table(left_text, '\s+') as t(token)
    where length(token) > 3
      and token not in ('incidente', 'problema', 'reporte', 'para', 'como', 'donde', 'sobre', 'esta', 'este')
  ),
  right_tokens as (
    select distinct token
    from regexp_split_to_table(right_text, '\s+') as t(token)
    where length(token) > 3
      and token not in ('incidente', 'problema', 'reporte', 'para', 'como', 'donde', 'sobre', 'esta', 'este')
  )
  select count(*)
  into token_union
  from (
    select token from left_tokens
    union
    select token from right_tokens
  ) as all_tokens;

  if token_union > 0 then
    score := score + round((token_intersection::numeric / token_union::numeric) * 30)::integer;
  end if;

  if _left.created_at is not null and _right.created_at is not null then
    if abs(extract(epoch from (_left.created_at - _right.created_at))) <= 86400 then
      score := score + 10;
    elsif abs(extract(epoch from (_left.created_at - _right.created_at))) <= 259200 then
      score := score + 6;
    end if;
  end if;

  if coalesce(_left.estado, '') <> 'resuelto' and coalesce(_right.estado, '') <> 'resuelto' then
    score := score + 5;
  end if;

  return least(score, 100);
end;
$$;

-- 3) Genera razones legibles para que el administrador sepa por qué se sugirió la coincidencia.
create or replace function public.incident_duplicate_reasons(
  _left public.incidents,
  _right public.incidents
)
returns text[]
language plpgsql
stable
as $$
declare
  reasons text[] := array[]::text[];
  distance_degrees double precision;
begin
  if public.normalize_incident_text(_left.tipo) <> ''
     and public.normalize_incident_text(_left.tipo) = public.normalize_incident_text(_right.tipo) then
    reasons := array_append(reasons, 'Mismo tipo de incidente');
  end if;

  if public.normalize_incident_text(_left.salon) <> ''
     and public.normalize_incident_text(_left.salon) = public.normalize_incident_text(_right.salon) then
    reasons := array_append(reasons, 'Mismo salón o dependencia');
  end if;

  if public.normalize_incident_text(_left.ubicacion_texto) <> ''
     and public.normalize_incident_text(_left.ubicacion_texto) = public.normalize_incident_text(_right.ubicacion_texto) then
    reasons := array_append(reasons, 'Misma ubicación registrada');
  end if;

  if _left.latitud is not null and _left.longitud is not null
     and _right.latitud is not null and _right.longitud is not null then
    distance_degrees := sqrt(power(_left.latitud - _right.latitud, 2) + power(_left.longitud - _right.longitud, 2));
    if distance_degrees <= 0.0005 then
      reasons := array_append(reasons, 'Ubicación geográfica muy cercana');
    elsif distance_degrees <= 0.0015 then
      reasons := array_append(reasons, 'Ubicación geográfica cercana');
    end if;
  end if;

  if _left.created_at is not null and _right.created_at is not null
     and abs(extract(epoch from (_left.created_at - _right.created_at))) <= 259200 then
    reasons := array_append(reasons, 'Reportados en fechas cercanas');
  end if;

  if array_length(reasons, 1) is null then
    reasons := array_append(reasons, 'Coincidencias en texto o palabras clave');
  end if;

  return reasons;
end;
$$;

-- 4) Permite consultar desde SQL los incidentes parecidos a un incidente específico.
create or replace function public.detect_similar_incidents(
  _incident_id uuid,
  _threshold integer default 55
)
returns table (
  incident_id uuid,
  similar_incident_id uuid,
  score integer,
  reasons text[]
)
language plpgsql
stable
as $$
declare
  base_incident public.incidents%rowtype;
  candidate public.incidents%rowtype;
  candidate_score integer;
begin
  select * into base_incident
  from public.incidents
  where id = _incident_id;

  if not found then
    return;
  end if;

  for candidate in
    select *
    from public.incidents
    where id <> _incident_id
      and grupo_id is null
      and coalesce(estado, '') <> 'resuelto'
  loop
    candidate_score := public.incident_duplicate_score(base_incident, candidate);

    if candidate_score >= _threshold then
      incident_id := _incident_id;
      similar_incident_id := candidate.id;
      score := candidate_score;
      reasons := public.incident_duplicate_reasons(base_incident, candidate);
      return next;
    end if;
  end loop;
end;
$$;

-- 5) Notifica automáticamente a los administradores cuando se crea un nuevo incidente similar a otros.
create or replace function public.notify_admins_on_possible_duplicate_incident()
returns trigger
language plpgsql
security definer
as $$
declare
  match_count integer;
  match_ids uuid[];
  match_scores integer[];
begin
  if new.grupo_id is not null or coalesce(new.estado, '') = 'resuelto' then
    return new;
  end if;

  select
    count(*),
    coalesce(array_agg(similar_incident_id order by score desc), array[]::uuid[]),
    coalesce(array_agg(score order by score desc), array[]::integer[])
  into match_count, match_ids, match_scores
  from public.detect_similar_incidents(new.id, 55);

  if match_count > 0 then
    insert into public.notifications (user_id, title, message, type, incident_id, metadata)
    select
      p.id,
      'Posibles incidentes duplicados detectados',
      format(
        'El incidente "%s" tiene %s reporte(s) similar(es). Revísalo en Administración de incidentes para decidir si deben agruparse.',
        coalesce(new.titulo, 'Incidente sin título'),
        match_count
      ),
      'duplicate_detected',
      new.id,
      jsonb_build_object(
        'incident_id', new.id,
        'similar_incident_ids', match_ids,
        'scores', match_scores,
        'threshold', 55
      )
    from public.profiles p
    where p.rol = 'admin';
  end if;

  return new;
end;
$$;

drop trigger if exists notify_admins_on_possible_duplicate_incident on public.incidents;

create trigger notify_admins_on_possible_duplicate_incident
after insert on public.incidents
for each row
execute procedure public.notify_admins_on_possible_duplicate_incident();

select pg_notify('pgrst', 'reload schema');
