import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Incident } from '../types';
import { useAuth } from '../context/AuthProvider';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend
} from 'recharts';

const COLORS = ['#0f766e', '#0284c7', '#0ea5e9', '#f97316', '#14b8a6'];

export default function Statistics() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
const { user, profile } = useAuth();

useEffect(() => {
  if (!user || !profile) return;

  (async () => {

    let query = supabase
      .from('incidents')
      .select('id,titulo,tipo,estado,created_at,updated_at,latitud,longitud,usuario_id')
      .order('created_at', { ascending: true });

    // Si NO es admin, filtra por usuario
    if (profile.rol !== 'admin') {
      query = query.eq('usuario_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      return;
    }

    setIncidents((data as Incident[]) ?? []);
    setLoading(false);

  })();
}, [user, profile]);

  const resolvedCases = useMemo(
    () => incidents.filter((incident) => incident.estado === 'resuelto').length,
    [incidents]
  );

  const pendingReview = useMemo(
    () => incidents.filter((incident) => incident.estado === 'reportado').length,
    [incidents]
  );

  const avgResolutionHours = useMemo(() => {
    const resolved = incidents.filter((incident) => incident.estado === 'resuelto' && incident.updated_at && incident.created_at);
    if (resolved.length === 0) return 0;

    const totalHours = resolved.reduce((sum, incident) => {
      const created = new Date(incident.created_at || '').getTime();
      const updated = new Date(incident.updated_at || '').getTime();
      return sum + Math.max(0, updated - created);
    }, 0);

    return totalHours / resolved.length / 1000 / 60 / 60;
  }, [incidents]);

  const incidentTypes = useMemo(() => {
    const tipoLabels: Record<string, string> = {
      bano: 'Baño',
      electricidad: 'Electricidad',
      infraestructura: 'Infraestructura',
      seguridad: 'Seguridad',
      otro: 'Otro'
    };
    const counts: Record<string, number> = {};
    incidents.forEach((incident) => {
      const key = (incident.tipo || 'otro').toLowerCase();
      const label = tipoLabels[key] ?? incident.tipo ?? 'Otros';
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  const statusData = useMemo(() => {
    const counts = { reportado: 0, en_proceso: 0, resuelto: 0 };
    incidents.forEach((incident) => {
      counts[incident.estado] = (counts[incident.estado] || 0) + 1;
    });
    return [
      { name: 'Reportado', value: counts.reportado },
      { name: 'En Proceso', value: counts.en_proceso },
      { name: 'Resuelto', value: counts.resuelto }
    ];
  }, [incidents]);

  const volumeData = useMemo(() => {
    const buckets: Record<string, number> = {};
    const labels: string[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const label = date.toLocaleDateString('es-CO', { weekday: 'short' });
      const iso = date.toISOString().slice(0, 10);
      buckets[iso] = 0;
      labels.push(label);
    }

    incidents.forEach((incident) => {
      const created = new Date(incident.created_at || '').toISOString().slice(0, 10);
      if (buckets[created] !== undefined) buckets[created] += 1;
    });

    return Object.entries(buckets).map(([date, value], index) => ({
      fecha: labels[index],
      incidentes: value
    }));
  }, [incidents]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1400px] space-y-8 print-container">
        <div className="print-header no-print">
          <div className="flex items-center justify-between">
            <div>
              <div className="title">Sistema de Reportes - Universidad de la Amazonia</div>
              <div className="meta">Reporte Estadístico de Incidentes</div>
            </div>
            <div className="meta">{new Date().toLocaleString('es-CO')}</div>
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8 print-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 sm:text-sm">Estadísticas</p>
              <h1 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">
                {profile?.rol === 'admin' ? 'Resumen general del sistema' : 'Resumen de tus reportes'}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Los datos provienen directamente de Supabase y se actualizan con cada reporte.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 sm:rounded-[28px] sm:p-6">
              <p className="text-sm text-slate-500">Incidentes Totales</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900 sm:text-4xl">{loading ? '...' : incidents.length}</p>
              <p className="mt-3 text-sm text-slate-500">Total de reportes creados</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 sm:rounded-[28px] sm:p-6">
              <p className="text-sm text-slate-500">Tiempo Medio de Resolución</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900 sm:text-4xl">{loading ? '...' : avgResolutionHours.toFixed(1)} h</p>
              <p className="mt-3 text-sm text-slate-500">Promedio de incidentes resueltos</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 sm:rounded-[28px] sm:p-6">
              <p className="text-sm text-slate-500">Casos Resueltos</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900 sm:text-4xl">{loading ? '...' : resolvedCases}</p>
              <p className="mt-3 text-sm text-slate-500">Incidentes con estado resuelto</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 sm:rounded-[28px] sm:p-6">
              <p className="text-sm text-slate-500">Pendientes de Revisión</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900 sm:text-4xl">{loading ? '...' : pendingReview}</p>
              <p className="mt-3 text-sm text-slate-500">Reportes aún sin procesar</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8">
            <div className="no-print flex items-center justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="no-print inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white sm:w-auto"
              >
                Imprimir estadísticas
              </button>
            </div>
            <div className="print-card">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Volumen de incidentes</h2>
                <p className="mt-2 text-sm text-slate-500">Reporte semanal de la actividad de tus incidentes.</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600">
                7 Días
              </div>
            </div>

            <div className="mt-8 h-[260px] min-w-0 sm:h-[320px] print-card">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={volumeData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [`${value}`, 'Incidentes']} />
                  <Legend formatter={() => 'Este período'} />
                  <Line type="monotone" dataKey="incidentes" stroke="#0284c7" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8 print-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Tipos de incidentes</h2>
                  <p className="mt-2 text-sm text-slate-500">Distribución por categoría.</p>
                </div>
              </div>

              <div className="mt-8 h-[260px] min-w-0 sm:h-[320px] print-card">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={incidentTypes} dataKey="value" nameKey="name" outerRadius={100} innerRadius={55} paddingAngle={4}>
                      {incidentTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value}`, 'Incidentes']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 space-y-3">
                {incidentTypes.map((item, index) => (
                  <div key={item.name} className="flex min-w-0 items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 print-card">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-3.5 w-3.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="min-w-0 break-words text-sm font-medium text-slate-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
