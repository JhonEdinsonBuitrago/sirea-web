import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllIncidents } from '../../services/incidents';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

export default function AdminDashboard() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: incidents } = await getAllIncidents();
      if (!incidents) return;

      const byEstado = ['reportado', 'en_proceso', 'resuelto'].map((status) => ({
        name: status.replace('_', ' '),
        value: incidents.filter((incident) => incident.estado === status).length
      }));

      const tiposMap: Record<string, number> = {};
      incidents.forEach((incident) => {
        tiposMap[incident.tipo] = (tiposMap[incident.tipo] || 0) + 1;
      });

      const byTipo = Object.entries(tiposMap).map(([name, value]) => ({ name, value }));
      setData([byEstado, byTipo]);
    })();
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 sm:text-sm">Administración</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">Dashboard administrativo</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Consulta el comportamiento general de los incidentes y accede rápidamente a la gestión administrativa.</p>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Incidentes por estado</h2>
            <p className="mt-1 text-sm text-slate-500">Distribución según el avance de atención.</p>
            <div className="mt-6 h-[260px] min-w-0 sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data[0] ?? []} dataKey="value" nameKey="name" outerRadius={90} label>
                    {data[0]?.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Incidentes por tipo</h2>
            <p className="mt-1 text-sm text-slate-500">Categorías más reportadas por los usuarios.</p>
            <div className="mt-6 h-[260px] min-w-0 sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data[1] ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Gestión</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Acceso rápido a la administración de incidentes</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Desde aquí puedes abrir el panel dedicado a la agrupación, asignación y seguimiento de incidentes.</p>
            </div>
            <Link
              to="/admin/incidents"
              className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 md:w-auto"
            >
              Ir a administración
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
