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

export async function updateIncidentStatus(id: string, estado: Incident['estado']) {
  // 1. Buscar el incidente actual para saber si pertenece a un grupo.
  const { data: existing, error: existingError } = await supabase
    .from('incidents')
    .select('id, usuario_id, titulo, tipo, grupo_id')
    .eq('id', id)
    .maybeSingle();

  if (existingError) {
    return { data: null, error: existingError };
  }

  // 2. Actualizar el estado del incidente individual.
  // OJO: la tabla incidents usa columna en español: estado.
  const { data, error } = await supabase
    .from('incidents')
    .update({ estado: estado })
    .eq('id', id)
    .select(incidentSelect)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  // 3. Si el incidente pertenece a un grupo, actualizar también el grupo.
  if (existing?.grupo_id) {
    // OJO: la tabla incident_groups usa columna en inglés: status.
    const { error: groupError } = await supabase
      .from('incident_groups')
      .update({ status: estado })
      .eq('id', existing.grupo_id);

    if (groupError) {
      return { data, error: groupError };
    }

    // 4. Sincronizar todos los incidentes del mismo grupo.
    
    const { error: incidentsGroupError } = await supabase
      .from('incidents')
      .update({ estado: estado })
      .eq('grupo_id', existing.grupo_id);

    if (incidentsGroupError) {
      return { data, error: incidentsGroupError };
    }
  }

  // 5. Notificar al usuario que reportó el incidente.
  if (existing) {
    const estadoLabel =
      estado === 'resuelto'
        ? 'Resuelto'
        : estado === 'en_proceso'
          ? 'En proceso'
          : 'Reportado';

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

  return { data, error: null };
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
