import { supabase } from '../lib/supabase';
import type { Incident } from '../types';
import { fetchAdminIds, createNotification } from './notifications';

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
  const { error } = await supabase
    .from('incidents')
    .insert([payload]);

  if (!error) {
    // RF-14: Notificar a todos los administradores del nuevo incidente
    const { data: adminIds } = await fetchAdminIds();
    if (adminIds && adminIds.length > 0) {
      await Promise.allSettled(
        adminIds.map((adminId) =>
          createNotification({
            user_id: adminId,
            type: 'new_incident',
            title: 'Nuevo incidente reportado',
            message: `Se ha reportado un nuevo incidente de tipo "${payload.tipo}": ${payload.titulo}`,
            read: false,
            incident_id: null,
            metadata: {}
          })
        )
      );
    }
  }

  return { data: null, error };
}

export async function updateIncidentStatus(id: string, estado: string) {
  // Primero obtenemos el incidente para saber a quién notificar
  const { data: existing } = await supabase
    .from('incidents')
    .select('usuario_id, titulo, tipo, grupo_id')
    .eq('id', id)
    .maybeSingle();

  const { data, error } = await supabase
    .from('incidents')
    .update({ estado })
    .eq('id', id)
    .select(incidentSelect)
    .maybeSingle();

  // Si el incidente pertenece a un grupo, sincronizar usando columna 'status'
  if (!error && existing?.grupo_id) {
    await supabase
      .from('incident_groups')
      .update({ status: estado })
      .eq('id', existing.grupo_id);

    // Sincronizar todos los incidentes del grupo
    await supabase
      .from('incidents')
      .update({ estado })
      .eq('grupo_id', existing.grupo_id);
  }

  if (!error && existing) {
    // RF-13: Notificar al usuario que reportó el incidente sobre el cambio de estado
    const estadoLabel =
      estado === 'resuelto' ? 'Resuelto' :
      estado === 'en_proceso' ? 'En proceso' : 'Reportado';

    const notifType = estado === 'resuelto' ? 'incident_resolved' : 'incident_updated';

    await createNotification({
      user_id: existing.usuario_id,
      type: notifType,
      title: 'Estado de tu reporte actualizado',
      message: `Tu reporte "${existing.titulo || existing.tipo}" cambió a: ${estadoLabel}`,
      read: false,
      incident_id: id,
      metadata: {}
    }).catch(() => {});
  }

  return { data, error };
}

export async function groupIncidents(ids: string[]) {
  const group_id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  const { data, error } = await supabase
    .from('incidents')
    .update({ grupo_id: group_id })
    .in('ids', ids)
    .select(incidentSelect);

  return { data, error, group_id };
}
