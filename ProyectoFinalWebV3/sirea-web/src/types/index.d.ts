export type Role = 'usuario' | 'admin';

export type NotificationType =
  | 'new_incident'
  | 'incident_updated'
  | 'incident_resolved'
  | 'duplicate_detected'
  | 'incident_stalled'
  | 'group_created';

export interface Profile {
  id: string;
  nombre?: string | null;
  email?: string | null;
  rol?: Role;
  imagen_url?: string | null;
  created_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  incident_id?: string | null;
  metadata: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface IncidentGroup {
  id: string;
  title: string;
  description: string | null;
  status: string;
}

export interface Incident {
  id: string;
  usuario_id: string;
  titulo?: string | null;
  tipo: string;
  descripcion: string;
  imagen_url: string;
  ubicacion_texto?: string | null;
  salon?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  estado: 'reportado' | 'en_proceso' | 'resuelto';
  grupo_id?: string | null;
  group_id?: string | null;
  incident_groups?: IncidentGroup | null;
  created_at?: string;
  updated_at?: string;
}
