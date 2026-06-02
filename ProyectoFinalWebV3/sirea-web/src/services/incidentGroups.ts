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

  const rpcResult = await supabase.rpc('create_incident_groups_with_incidents', {
    _title: title,
    _description: description,
    _status: 'reportado',
    _incident_ids: incidentIds
  });

  if (!rpcResult.error) {
    return { data: rpcResult.data as IncidentGroup | null, error: null };
  }

  const message = String(rpcResult.error?.message ?? '');
  const isMissingRpc = rpcResult.error?.code === 'PGRST202' || message.includes('Could not find the function');

  if (!isMissingRpc) {
    return { data: null, error: rpcResult.error };
  }

  console.warn(
    'create_incident_groups_with_incidents RPC no existe o no está en cache. Se usará agrupación directa como respaldo.',
    rpcResult.error
  );

  const groupResult = await supabase
    .from('incident_groups')
    .insert({
      title,
      description,
      status: 'reportado'
    })
    .select('*')
    .single();

  if (groupResult.error || !groupResult.data) {
    return { data: null, error: groupResult.error ?? rpcResult.error };
  }

  const updateResult = await supabase
    .from('incidents')
    .update({ grupo_id: groupResult.data.id })
    .in('id', incidentIds);

  if (updateResult.error) {
    await supabase.from('incident_groups').delete().eq('id', groupResult.data.id);
    return { data: null, error: updateResult.error };
  }

  return { data: groupResult.data as IncidentGroup, error: null };
}

export async function updateIncidentGroupStatus(groupId: string, status: Incident['estado']): Promise<{ data: IncidentGroup | null; error: any }> {
  // Primero intentamos con el RPC
  const rpcResult = await supabase.rpc('update_incident_groups_status', {
    _group_id: groupId,
    _status: status
  });

  if (!rpcResult.error) {
    return { data: rpcResult.data as IncidentGroup | null, error: null };
  }

  console.warn('update_incident_groups_status RPC falló, usando actualización directa:', rpcResult.error);

  // Fallback: actualizar directamente la tabla incident_groups (columna status)
  // y sincronizar todos los incidentes del grupo
  const { data, error } = await supabase
    .from('incident_groups')
    .update({ status })
    .eq('id', groupId)
    .select('*')
    .single();

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
