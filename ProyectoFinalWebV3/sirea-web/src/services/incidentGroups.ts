import { supabase } from '../lib/supabase';
import type { Incident, IncidentGroup } from '../types';

const incidentSelect = `
  *,
  incident_groups (
    id,
    title,
    description,
    status
  )
`;

export async function getAdminIncidentsWithGroups(): Promise<{ data: Incident[] | null; error: any }> {
  const { data, error } = await supabase
    .from('incidents')
    .select(incidentSelect)
    .order('created_at', { ascending: false });

  if (!error && data) {
    return { data: data as Incident[] | null, error: null };
  }

  console.warn('getAdminIncidentsWithGroups: failed to load incident_groups relation, retrying without relation', error);

  const fallback = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false });

  if (!fallback.error) {
    return { data: fallback.data as Incident[] | null, error: null };
  }

  return { data: null, error: fallback.error };
}

export async function createIncidentGroupWithIncidents(
  title: string,
  description: string,
  incidentIds: string[]
): Promise<{ data: IncidentGroup | null; error: any }> {
  if (incidentIds.length < 2) {
    return { data: null, error: new Error('Debes seleccionar al menos dos incidentes para agrupar.') };
  }

  // Crear el grupo directamente sin usar RPC (evita problemas con columnas incorrectas)
  const groupResult = await supabase
    .from('incident_groups')
    .insert({ title, description: null, status: 'reportado' })
    .select('*');

  if (groupResult.error || !groupResult.data || groupResult.data.length === 0) {
    return { data: null, error: groupResult.error };
  }

  const groupData = groupResult.data[0];

  const updateResult = await supabase
    .from('incidents')
    .update({ grupo_id: groupData.id })
    .in('id', incidentIds);

  if (updateResult.error) {
    await supabase.from('incident_groups').delete().eq('id', groupData.id);
    return { data: null, error: updateResult.error };
  }

  return { data: groupData as IncidentGroup, error: null };
}

export async function updateIncidentGroupStatus(groupId: string, status: Incident['estado']): Promise<{ data: IncidentGroup | null; error: any }> {
  // Actualizar directamente sin RPC
  const { data: rows, error } = await supabase
    .from('incident_groups')
    .update({ status })
    .eq('id', groupId)
    .select('*');
  
  const data = rows?.[0] ?? null;

  if (!error) {
    // Sincronizar estado en todos los incidentes del grupo
    await supabase
      .from('incidents')
      .update({ estado: status })
      .eq('grupo_id', groupId);
  }

  return { data: data as IncidentGroup | null, error };
}

export async function getIncidentGroups(): Promise<{ data: IncidentGroup[] | null; error: any }> {
  const { data, error } = await supabase.from('incident_groups').select('*').order('created_at', { ascending: false });
  return { data: data as IncidentGroup[] | null, error };
}
