import { supabase } from '../lib/supabase';
import type { Incident } from '../types';

export interface CreateIncidentPayload {
  usuario_id: string;
  titulo: string;
  tipo: string;
  descripcion: string;
  imagen_url: string;
  ubicacion_texto?: string | null;
  salon?: string | null;
  latitud?: number | null;
  longitud?: number | null;
}

const incidentSelect = `
  *,
  incident_groups (
    id,
    title,
    description,
    status
  )
`;
export async function getAllIncidents(): Promise<{ data: Incident[] | null; error: any }> {
  const { data, error } = await supabase
    .from('incidents')
    .select(`
      *,
      incident_groups (
        id,
        title,
        description,
        status
      )
    `)
    .order('created_at', { ascending: false });

  if (!error && data) {
    return {
      data: data as Incident[] | null,
      error: null
    };
  }

  console.warn('getAllIncidents: failed to load incident_groups relation, retrying without relation', error);

  const fallback = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false });

  if (!fallback.error) {
    return {
      data: fallback.data as Incident[] | null,
      error: null
    };
  }

  return {
    data: null,
    error: fallback.error
  };
}

export async function createIncident(
  payload: CreateIncidentPayload
): Promise<{ data: Incident | null; error: any }> {
  // Para crear reportes no necesitamos traer relaciones después del insert.
  // Esto evita errores por relaciones/cache/RLS al momento de registrar el incidente.
  const { error } = await supabase
    .from('incidents')
    .insert([payload]);

  return { data: null, error };
}

export async function updateIncidentStatus(id: string, estado: string) {
  const { data, error } = await supabase
    .from('incidents')
    .update({ estado })
    .eq('id', id)
    .select(incidentSelect)
    .maybeSingle();

  return { data, error };
}

export async function groupIncidents(ids: string[]) {
  const group_id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  const { data, error } = await supabase
    .from('incidents')
    .update({ grupo_id: group_id })
    .in('id', ids)
    .select(incidentSelect);

  return { data, error, group_id };
}