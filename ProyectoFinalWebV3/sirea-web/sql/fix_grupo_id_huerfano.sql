-- Corrección rápida para error 23503 al crear fk_incidents_incident_groups.
-- Ejecuta esto primero si Supabase muestra:
-- Key (grupo_id)=(...) is not present in table "incident_groups".

create table if not exists public.incident_groups (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  status text not null default 'reportado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.incidents
  add column if not exists grupo_id uuid;

-- Opción segura: desasocia incidentes que apuntan a grupos inexistentes.
-- No elimina incidentes; solo deja grupo_id en NULL para poder crear la FK.
update public.incidents i
set grupo_id = null
where i.grupo_id is not null
  and not exists (
    select 1
    from public.incident_groups g
    where g.id = i.grupo_id
  );

-- Ahora sí se puede crear la clave foránea.
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

select pg_notify('pgrst', 'reload schema');
