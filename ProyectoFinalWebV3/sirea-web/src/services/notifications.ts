import { supabase } from '../lib/supabase';
import type { Notification, NotificationType } from '../types';

export interface NotificationFilters {
  unreadOnly?: boolean;
  limit?: number;
  types?: NotificationType[];
}

export async function getNotifications(
  userId: string,
  filters: NotificationFilters = {}
): Promise<{ data: Notification[] | null; error: any }> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('read', { ascending: true })
    .order('created_at', { ascending: false });

  if (filters.unreadOnly) {
    query = query.eq('read', false);
  }

  if (filters.types && filters.types.length > 0) {
    query = query.in('type', filters.types);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  return { data: data as Notification[] | null, error };
}

export async function fetchAdminIds(): Promise<{ data: string[] | null; error: any }> {
  const { data, error } = await supabase.from('profiles').select('id').eq('rol', 'admin');
  if (error || !data) {
    return { data: null, error };
  }
  return { data: data.map((item: { id: string }) => item.id), error: null };
}

export async function createNotification(
  notification: Omit<Notification, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: Notification[] | null; error: any }> {
  const { data, error } = await supabase.from('notifications').insert([notification]).select();
  return { data: data as Notification[] | null, error };
}

export async function markAsRead(notificationId: string): Promise<{ error: any }> {
  const { error } = await supabase.rpc('mark_notification_as_read', {
    notification_id: notificationId
  });

  return { error };
}

export async function markAllAsRead(userId: string): Promise<{ error: any }> {
  const { error } = await supabase.rpc('mark_all_notifications_as_read', {
    current_user: userId
  });

  return { error };
}

export type NotificationRealtimePayload = {
  eventType: string;
  table: string;
  schema: string;
  record: Notification;
  old_record?: Notification;
};

export async function subscribeToNotifications(
  userId: string,
  callback: (payload: NotificationRealtimePayload) => void
): Promise<() => Promise<void>> {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload: unknown) => {
        callback(payload as NotificationRealtimePayload);
      }
    );

  const { error } = await channel.subscribe();
  if (error) {
    console.error('Error subscribing to notifications realtime:', error);
    return async () => {};
  }

  return async () => {
    await supabase.removeChannel(channel);
  };
}
