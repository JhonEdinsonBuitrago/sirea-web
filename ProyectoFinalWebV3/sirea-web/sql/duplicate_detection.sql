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
