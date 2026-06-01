import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, CheckCircle2, FileText, ListChecks, ShieldAlert, Sparkles, TrendingUp, UserCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Incident } from '../types';
import { useAuth } from '../context/AuthProvider';
import Skeleton from '../components/Skeleton';

export default function Dashboard() {
  const { profile, user, loading: authLoading } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  if (!user || !profile) return;

  (async () => {

    let query = supabase
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

    // Usuarios normales -> solo sus incidentes
    if (profile.rol !== 'admin') {
      query = query.eq('usuario_id', user.id);
    }

    const { data, error } = await query;

    if (!error && data) {
      setIncidents(data as Incident[]);
      setLoading(false);
      return;
    }

    console.warn('Dashboard: failed to load incident_groups relation, retrying without relation', error);

    const fallback = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });

    if (!fallback.error && fallback.data) {
      setIncidents(fallback.data as Incident[]);
    }

    setLoading(false);

  })();
}, [user, profile]);
  const counts = useMemo(() => {
    const total = incidents.length;
    const inProcess = incidents.filter((item) => item.estado === 'en_proceso').length;
    const resolved = incidents.filter((item) => item.estado === 'resuelto').length;
    const reportado = incidents.filter((item) => item.estado === 'reportado').length;
    return { total, inProcess, resolved, reportado };
  }, [incidents]);

  const recentActivities = useMemo(() => {
    const activities = [] as Array<{ title: string; description: string; date: string; icon: React.ReactNode }>;
    if (incidents.length > 0) {
      const latest = incidents[0];
      activities.push({
        title: 'Nuevo reporte creado',
        description: `ID - ${latest.id}`,
        date: latest.created_at ? new Date(latest.created_at).toLocaleString() : 'Hace unos momentos',
        icon: <Sparkles className="w-4 h-4" />
      });
      const resolvedIncident = incidents.find((item) => item.estado === 'resuelto');
      if (resolvedIncident) {
        activities.push({
          title: 'Incidente resuelto',
          description: `${resolvedIncident.tipo}`,
          date: resolvedIncident.updated_at ? new Date(resolvedIncident.updated_at).toLocaleString() : 'Recientemente',
          icon: <CheckCircle2 className="w-4 h-4" />
        });
      }
    }
    activities.push({
      title: 'Perfil actualizado',
      description: 'Cambió de correo institucional',
      date: 'Hace 2 días',
      icon: <UserCircle className="w-4 h-4" />
    });
    return activities;
  }, [incidents]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-sky-700 font-semibold">Hola, {profile?.nombre ? profile.nombre.split(' ')[0] : 'Usuario'} 👋</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Aquí está el estado de tus reportes para la Universidad de la Amazonia.</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-500">Revisa el progreso de tus incidentes y mantente al día con actividad reciente.</p>
          </div>
          <Link
            to="/incidents/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200/30 transition hover:bg-sky-800"
          >
            <FileText className="w-4 h-4" />
            Nuevo Reporte de Incidente
          </Link>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total de reportes</p>
                <p className="mt-4 text-3xl font-semibold text-slate-900">{loading ? <Skeleton className="h-8 w-24" /> : counts.total}</p>
              </div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <ListChecks className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-500">{counts.total > 0 ? `${counts.total - 12}% vs last month` : 'Sin datos previos'}</div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">En Proceso</p>
                <p className="mt-4 text-3xl font-semibold text-slate-900">{loading ? <Skeleton className="h-8 w-24" /> : counts.inProcess}</p>
              </div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-500">{counts.inProcess || 'Sin incidentes activos'}</div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Resueltos</p>
                <p className="mt-4 text-3xl font-semibold text-slate-900">{loading ? <Skeleton className="h-8 w-24" /> : counts.resolved}</p>
              </div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-500">{counts.resolved || 'Aún no hay incidentes resueltos'}</div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Últimos Incidentes</h2>
                <p className="mt-1 text-sm text-slate-500">Ver los reportes más recientes y su estado actual.</p>
              </div>
              <Link to="/reports" className="text-sm font-medium text-sky-600 hover:text-sky-700">Ver todos &rarr;</Link>
            </div>

            <div className="mt-6 grid gap-4 md:hidden">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-4 h-4 w-24" />
                    <Skeleton className="mt-4 h-6 w-28" />
                  </div>
                ))
              ) : incidents.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No hay incidentes para mostrar.
                </div>
              ) : (
                incidents.slice(0, 5).map((incident) => (
                  <Link
                    key={incident.id}
                    to={`/incidents/${incident.id}`}
                    className="block min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Incidente</p>
                        <h3 className="mt-2 break-words text-base font-semibold text-slate-900">{incident.tipo}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {incident.created_at ? new Date(incident.created_at).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }) : '-'}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase ${
                          incident.estado === 'resuelto'
                            ? 'bg-emerald-100 text-emerald-700'
                            : incident.estado === 'en_proceso'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {incident.estado === 'resuelto'
                          ? 'Resuelto'
                          : incident.estado === 'en_proceso'
                          ? 'En Proceso'
                          : 'Urgente'}
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-sky-700">Ver detalles &rarr;</p>
                  </Link>
                ))
              )}
            </div>

            <div className="mt-6 hidden overflow-x-auto rounded-3xl border border-slate-200 md:block">
              <table className="min-w-[720px] border-separate border-spacing-0 text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Título del incidente</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <tr key={index} className="border-t border-slate-100">
                        <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                      </tr>
                    ))
                  ) : incidents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No hay incidentes para mostrar.</td>
                    </tr>
                  ) : (
                    incidents.slice(0, 5).map((incident) => (
                      <tr key={incident.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">{incident.tipo}</td>
                        <td className="px-6 py-4 text-slate-600">{incident.created_at ? new Date(incident.created_at).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }) : '-'}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                              incident.estado === 'resuelto'
                                ? 'bg-emerald-100 text-emerald-700'
                                : incident.estado === 'en_proceso'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {incident.estado === 'resuelto'
                              ? 'Resuelto'
                              : incident.estado === 'en_proceso'
                              ? 'En Proceso'
                              : 'Urgente'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Link to={`/incidents/${incident.id}`} className="font-medium text-sky-600 hover:text-sky-700">
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Actividad Reciente</h2>
                <p className="mt-1 text-sm text-slate-500">Seguimiento rápido de tus últimos movimientos.</p>
              </div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                    {activity.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{activity.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{activity.description}</p>
                    <p className="mt-2 text-xs text-slate-400">{activity.date}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Ver historial completo
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
