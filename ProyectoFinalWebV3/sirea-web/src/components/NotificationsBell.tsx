import { useMemo, useState } from 'react';
import { Bell, CheckCircle2, Clock3, Sparkles, ShieldAlert, AlertTriangle, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationType } from '../types';

const notificationMeta: Record<NotificationType, { label: string; icon: typeof Bell; color: string }> = {
  new_incident: { label: 'Nuevo', icon: Sparkles, color: 'bg-sky-100 text-sky-700' },
  incident_updated: { label: 'Actualizado', icon: ShieldAlert, color: 'bg-amber-100 text-amber-700' },
  incident_resolved: { label: 'Resuelto', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700' },
  duplicate_detected: { label: 'Duplicado', icon: AlertTriangle, color: 'bg-rose-100 text-rose-700' },
  incident_stalled: { label: 'Atascado', icon: Clock3, color: 'bg-violet-100 text-violet-700' },
  group_created: { label: 'Grupo', icon: Sparkles, color: 'bg-slate-100 text-slate-700' }
};

function formatRelativeTime(dateString: string) {
  const time = new Date(dateString).getTime();
  const diffSeconds = Math.max(0, Math.floor((Date.now() - time) / 1000));

  if (diffSeconds < 60) return `Hace ${diffSeconds} segundos`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} horas`;
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? 'Hace 1 día' : `Hace ${diffDays} días`;
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, loading, filter, setFilter, markNotificationAsRead, markAllNotificationsAsRead } = useNotifications();

  const previewNotifications = useMemo(
    () => notifications.slice(0, 6),
    [notifications]
  );

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex h-12 w-12 items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
        onClick={() => setOpen((current) => !current)}
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[0.65rem] font-semibold text-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-4 right-4 top-20 z-50 max-h-[calc(100vh-6rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[360px]">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notificaciones</p>
              <p className="text-xs text-slate-500">Últimas actualizaciones del sistema</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => markAllNotificationsAsRead()}
                className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Marcar todas
              </button>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2 border-b border-slate-200 px-4 py-4">
            <div className="flex flex-wrap gap-2">
              {(['all', 'new_incident', 'incident_updated', 'incident_resolved', 'duplicate_detected', 'incident_stalled', 'group_created'] as Array<NotificationType | 'all'>).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${filter === value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {value === 'all' ? 'Todas' : notificationMeta[value].label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[min(360px,calc(100vh-18rem))] overflow-y-auto px-4 py-3">
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="animate-pulse rounded-3xl bg-slate-100 p-4" />
                ))}
              </div>
            ) : previewNotifications.length === 0 ? (
              <div className="rounded-3xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                No hay notificaciones recientes.
              </div>
            ) : (
              <div className="space-y-3">
                {previewNotifications.map((notification) => {
                  const meta = notificationMeta[notification.type];
                  const Icon = meta.icon;
                  return (
                    <div key={notification.id} className={`rounded-3xl border ${notification.read ? 'border-slate-200 bg-white' : 'border-sky-200 bg-slate-50'} p-4`}> 
                      <div className="flex items-start gap-3">
                        <span className={`${meta.color} inline-flex h-10 w-10 items-center justify-center rounded-3xl`}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                              <p className="mt-1 text-sm text-slate-500">{notification.message}</p>
                            </div>
                            <span className="shrink-0 text-xs text-slate-400">{formatRelativeTime(notification.created_at || '')}</span>
                          </div>
                          {!notification.read && (
                            <button
                              type="button"
                              onClick={() => markNotificationAsRead(notification.id)}
                              className="mt-3 rounded-full bg-slate-900 px-3 py-2 text-[0.70rem] font-semibold text-white transition hover:bg-slate-800"
                            >
                              Marcar leída
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{unreadCount} no leídas</span>
              <span>{notifications.length} total</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
