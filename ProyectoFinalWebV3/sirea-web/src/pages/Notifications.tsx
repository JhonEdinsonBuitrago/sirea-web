import { Bell, CheckCircle2, Clock3, Sparkles, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

const notificationMap = {
  new_incident: { label: 'Nuevo incidente', icon: Sparkles, color: 'bg-sky-100 text-sky-700' },
  incident_updated: { label: 'Incidente actualizado', icon: ShieldAlert, color: 'bg-amber-100 text-amber-700' },
  incident_resolved: { label: 'Incidente resuelto', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700' },
  duplicate_detected: { label: 'Duplicado detectado', icon: AlertTriangle, color: 'bg-rose-100 text-rose-700' },
  incident_stalled: { label: 'Incidente atascado', icon: Clock3, color: 'bg-violet-100 text-violet-700' },
  group_created: { label: 'Grupo creado', icon: Sparkles, color: 'bg-slate-100 text-slate-700' }
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

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, filter, setFilter, markNotificationAsRead, markAllNotificationsAsRead } = useNotifications();

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 sm:text-sm">Notificaciones</p>
              <h1 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">Centro de notificaciones</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Consulta actualizaciones en tiempo real, clasifica por tipo y mantén tu flujo de trabajo claro.</p>
            </div>
            <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={() => markAllNotificationsAsRead()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
              >
                Marcar todas como leídas
              </button>
              <span className="rounded-full bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{unreadCount} no leídas</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_0.7fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Filtro por tipo</h2>
                <p className="mt-1 text-sm text-slate-500">Selecciona el tipo de notificación que quieras priorizar.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'new_incident', 'incident_updated', 'incident_resolved', 'duplicate_detected', 'incident_stalled', 'group_created'] as Array<string>).map((typeKey) => (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => setFilter(typeKey as any)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === typeKey ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    {typeKey === 'all' ? 'Todas' : notificationMap[typeKey as keyof typeof notificationMap]?.label ?? typeKey}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[none] space-y-4 overflow-y-visible pr-0 xl:max-h-[calc(100vh-310px)] xl:overflow-y-auto xl:pr-2">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-28 animate-pulse rounded-[28px] bg-slate-100" />
                ))
              ) : notifications.length === 0 ? (
                <div className="rounded-[28px] bg-slate-50 p-8 text-center text-sm text-slate-500">No hay notificaciones para mostrar.</div>
              ) : (
                notifications.map((notification) => {
                  const meta = notificationMap[notification.type];
                  const Icon = meta.icon;
                  return (
                    <article key={notification.id} className={`rounded-[28px] border p-5 shadow-sm transition ${notification.read ? 'border-slate-200 bg-white' : 'border-sky-200 bg-slate-50'}`}>
                      <div className="flex min-w-0 items-start gap-4">
                        <div className={`${meta.color} inline-flex h-12 w-12 items-center justify-center rounded-3xl`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                            <div>
                              <h3 className="break-words text-base font-semibold text-slate-900 sm:text-lg">{notification.title}</h3>
                              <p className="mt-1 text-sm text-slate-500">{notification.message}</p>
                            </div>
                            <span className="text-xs text-slate-400">{formatRelativeTime(notification.created_at || '')}</span>
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{notification.type}</span>
                            {!notification.read && (
                              <button
                                type="button"
                                onClick={() => markNotificationAsRead(notification.id)}
                                className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                              >
                                Marcar leída
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
            <div className="space-y-6">
              <div className="rounded-[24px] bg-slate-50 p-5 sm:rounded-[32px]">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Resumen</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">{notifications.length}</p>
                <p className="mt-1 text-sm text-slate-500">Notificaciones totales</p>
              </div>
              <div className="rounded-[24px] bg-slate-50 p-5 sm:rounded-[32px]">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Pendientes</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">{unreadCount}</p>
                <p className="mt-1 text-sm text-slate-500">No leídas</p>
              </div>
              <div className="rounded-[24px] bg-slate-50 p-5 sm:rounded-[32px]">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Sugerencia</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">Mantén las notificaciones leídas para que los administradores identifiquen rápidamente los incidentes que requieren seguimiento.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
