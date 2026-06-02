import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardList, Layers, MapPin, Save, SearchCheck, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminIncidentGroups } from '../../hooks/useAdminIncidentGroups';
import { updateIncidentStatus } from '../../services/incidents';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import type { Incident } from '../../types';
import type { SimilarIncidentPair } from '../../utils/incidentSimilarity';

const COLORS = ['#ef4444', '#f59e0b', '#10b981'];
const TIPO_LABELS: Record<string, string> = {
  bano: 'Baño', electricidad: 'Electricidad',
  infraestructura: 'Infraestructura', seguridad: 'Seguridad', otro: 'Otro'
};

function formatDate(date?: string) {
  if (!date) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
}

function getIncidentLocation(incident: Incident) {
  return incident.salon || incident.ubicacion_texto || 'Sin ubicación';
}

function getScoreStyle(score: number) {
  if (score >= 80) return 'bg-rose-100 text-rose-700';
  if (score >= 65) return 'bg-amber-100 text-amber-700';
  return 'bg-sky-100 text-sky-700';
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Alta coincidencia';
  if (score >= 65) return 'Coincidencia media';
  return 'Coincidencia posible';
}

function buildSuggestedTitle(pair: SimilarIncidentPair) {
  const type = pair.primary.tipo || pair.duplicate.tipo || 'Incidente';
  const location = getIncidentLocation(pair.primary) !== 'Sin ubicación'
    ? getIncidentLocation(pair.primary)
    : getIncidentLocation(pair.duplicate);
  return `Posible duplicado: ${type}${location !== 'Sin ubicación' ? ` - ${location}` : ''}`;
}

function buildSuggestedDescription(pair: SimilarIncidentPair) {
  return [
    `Agrupación sugerida automáticamente con ${pair.score}% de similitud.`,
    `Criterios: ${pair.reasons.join(', ')}.`,
    'El administrador debe confirmar antes de crear el grupo.'
  ].join(' ');
}

type Tab = 'incidentes' | 'grupos' | 'estadisticas';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('incidentes');
  const [statusMap, setStatusMap] = useState<Record<string, Incident['estado']>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');


  const {
    incidents, loading, saving, selected, selectedCount,
    duplicateSuggestions, toggleSelection, clearSelection,
    selectIncidents, createGroup, syncGroupStatus
  } = useAdminIncidentGroups();

  // Initialize status map
  useEffect(() => {
    const map: Record<string, Incident['estado']> = {};
    incidents.forEach((i) => { map[i.id] = i.estado; });
    setStatusMap(map);
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (statusFilter && incident.estado !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          (incident.titulo ?? incident.tipo).toLowerCase().includes(q) ||
          incident.tipo.toLowerCase().includes(q) ||
          incident.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [incidents, statusFilter, searchQuery]);

  const selectedIncidents = useMemo(
    () => incidents.filter((i) => selected[i.id]),
    [incidents, selected]
  );

  const groupedCount = useMemo(
    () => incidents.filter((i) => i.grupo_id || i.group_id).length,
    [incidents]
  );

  // Stats data
  const byEstado = useMemo(() => [
    { name: 'Reportado', value: incidents.filter((i) => i.estado === 'reportado').length },
    { name: 'En proceso', value: incidents.filter((i) => i.estado === 'en_proceso').length },
    { name: 'Resuelto', value: incidents.filter((i) => i.estado === 'resuelto').length },
  ], [incidents]);

  const byTipo = useMemo(() => {
    const map: Record<string, number> = {};
    incidents.forEach((i) => {
      const label = TIPO_LABELS[i.tipo] ?? i.tipo;
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  const handleSaveStatus = async (incident: Incident) => {
    const newStatus = statusMap[incident.id];
    if (!newStatus || newStatus === incident.estado) return;
    setSavingId(incident.id);
    const { error } = await updateIncidentStatus(incident.id, newStatus);
    setSavingId(null);
    if (error) { toast.error('Error al actualizar estado'); return; }
    toast.success('Estado actualizado correctamente');
  };

  const handleOpenSuggestedGroup = (suggestion: SimilarIncidentPair) => {
    selectIncidents(suggestion.incidentIds);
    setGroupTitle(buildSuggestedTitle(suggestion));

    setGroupModalOpen(true);
    setActiveTab('grupos');
  };

  const handleCreateGroup = async () => {
    if (!groupTitle.trim()) { toast.error('Ingresa un título para el grupo.'); return; }
    const { error } = await createGroup(groupTitle.trim(), '');
    if (error) { toast.error(error.message || 'Error creando el grupo.'); return; }
    toast.success('Grupo creado correctamente.');
    setGroupModalOpen(false);
    setGroupTitle('');
   
  };

  const handleGroupStatusChange = async (groupId: string, status: Incident['estado']) => {
    const { error } = await syncGroupStatus(groupId, status);
    if (error) { toast.error('No fue posible sincronizar el estado.'); return; }
    toast.success('Estado del grupo sincronizado.');
  };

  const tabs: { key: Tab; label: string; icon: any; badge?: number }[] = [
    { key: 'incidentes', label: 'Incidentes', icon: ClipboardList, badge: incidents.filter(i => i.estado === 'reportado').length },
    { key: 'grupos', label: 'Grupos', icon: Layers, badge: duplicateSuggestions.length },
    { key: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">Panel Administrativo</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">Gestión de incidentes</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Administra, agrupa y analiza todos los reportes de la Universidad de la Amazonia.</p>

          {/* Stats row */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Total</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{incidents.length}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4">
              <p className="text-xs text-rose-600">Pendientes</p>
              <p className="mt-1 text-2xl font-bold text-rose-700">{incidents.filter(i => i.estado === 'reportado').length}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs text-amber-600">En proceso</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">{incidents.filter(i => i.estado === 'en_proceso').length}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs text-emerald-600">Resueltos</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{incidents.filter(i => i.estado === 'resuelto').length}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  active ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge && tab.badge > 0 ? (
                  <span className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold ${active ? 'bg-white text-slate-900' : 'bg-rose-500 text-white'}`}>
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* TAB: INCIDENTES */}
        {activeTab === 'incidentes' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, tipo o ID..."
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-sky-400"
              >
                <option value="">Todos los estados</option>
                <option value="reportado">Reportado</option>
                <option value="en_proceso">En proceso</option>
                <option value="resuelto">Resuelto</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : filteredIncidents.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-500">No hay incidentes que coincidan.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[700px] w-full border-separate border-spacing-0 text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-5 py-4 text-left font-medium">Incidente</th>
                        <th className="px-5 py-4 text-left font-medium">Tipo</th>
                        <th className="px-5 py-4 text-left font-medium">Ubicación</th>
                        <th className="px-5 py-4 text-left font-medium">Fecha</th>
                        <th className="px-5 py-4 text-left font-medium">Estado</th>
                        <th className="px-5 py-4 text-left font-medium">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIncidents.map((incident) => (
                        <tr key={incident.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {incident.imagen_url && (
                                <img src={incident.imagen_url} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate max-w-[180px]">{incident.titulo || incident.tipo}</p>
                                <p className="text-xs text-slate-400">#{incident.id.slice(0, 8)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-600">{TIPO_LABELS[incident.tipo] ?? incident.tipo}</td>
                          <td className="px-5 py-4 text-slate-600 max-w-[140px] truncate">{getIncidentLocation(incident)}</td>
                          <td className="px-5 py-4 text-slate-500">{formatDate(incident.created_at)}</td>
                          <td className="px-5 py-4">
                            <select
                              value={statusMap[incident.id] ?? incident.estado}
                              onChange={(e) => setStatusMap(prev => ({ ...prev, [incident.id]: e.target.value as Incident['estado'] }))}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-sky-400"
                            >
                              <option value="reportado">Reportado</option>
                              <option value="en_proceso">En proceso</option>
                              <option value="resuelto">Resuelto</option>
                            </select>
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => handleSaveStatus(incident)}
                              disabled={savingId === incident.id || statusMap[incident.id] === incident.estado}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              <Save className="h-3.5 w-3.5" />
                              {savingId === incident.id ? 'Guardando...' : 'Guardar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: GRUPOS */}
        {activeTab === 'grupos' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Total incidentes</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{incidents.length}</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Agrupados</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{groupedCount}</p>
              </div>
              <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-5 shadow-sm">
                <p className="text-sm text-amber-600">Posibles duplicados</p>
                <p className="mt-2 text-3xl font-bold text-amber-700">{duplicateSuggestions.length}</p>
              </div>
            </div>

            {/* Duplicate suggestions */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                    <SearchCheck className="h-3.5 w-3.5" /> Detección automática RF-10
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-900">Posibles duplicados</h2>
                  <p className="mt-1 text-sm text-slate-500">Revisa y confirma antes de agrupar.</p>
                </div>
              </div>

              <div className="mt-5">
                {loading ? (
                  <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
                ) : duplicateSuggestions.length === 0 ? (
                  <div className="flex flex-col items-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    <p className="mt-3 text-sm font-semibold text-slate-900">Sin duplicados detectados</p>
                    <p className="mt-1 text-sm text-slate-500">Cuando aparezcan, se mostrarán aquí.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {duplicateSuggestions.map((suggestion) => (
                      <article key={suggestion.id} className="rounded-[24px] border border-amber-100 bg-amber-50/40 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${getScoreStyle(suggestion.score)}`}>
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {getScoreLabel(suggestion.score)} · {suggestion.score}%
                          </span>
                          <button
                            onClick={() => handleOpenSuggestedGroup(suggestion)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            <Sparkles className="h-3.5 w-3.5" /> Agrupar
                          </button>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {[suggestion.primary, suggestion.duplicate].map((inc) => (
                            <div key={inc.id} className="rounded-xl border border-slate-200 bg-white p-3">
                              <p className="text-xs font-semibold text-slate-900 truncate">{inc.titulo ?? inc.tipo}</p>
                              <p className="mt-1 text-xs text-slate-500 truncate">{getIncidentLocation(inc)}</p>
                              <p className="mt-1 text-xs text-slate-400">{formatDate(inc.created_at)}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {suggestion.reasons.map((r) => (
                            <span key={r} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">{r}</span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Manual grouping */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Agrupación manual</h2>
                  <p className="mt-1 text-sm text-slate-500">Selecciona 2 o más incidentes para agruparlos.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { if (selectedCount < 2) { toast.error('Selecciona al menos 2 incidentes.'); return; } setGroupModalOpen(true); }}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-400"
                  >
                    <Layers className="h-4 w-4" /> Agrupar ({selectedCount})
                  </button>
                  {selectedCount > 0 && (
                    <button onClick={clearSelection} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />)
                ) : (
                  incidents.map((incident) => (
                    <label key={incident.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${selected[incident.id] ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                      <input
                        type="checkbox"
                        checked={!!selected[incident.id]}
                        onChange={() => toggleSelection(incident.id)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{incident.titulo ?? incident.tipo}</p>
                        <p className="text-xs text-slate-500">{TIPO_LABELS[incident.tipo] ?? incident.tipo} · {getIncidentLocation(incident)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        incident.estado === 'resuelto' ? 'bg-emerald-100 text-emerald-700' :
                        incident.estado === 'en_proceso' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {incident.estado === 'resuelto' ? 'Resuelto' : incident.estado === 'en_proceso' ? 'En proceso' : 'Reportado'}
                      </span>
                      {(incident.grupo_id || incident.group_id) && (
                        <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">Agrupado</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: ESTADÍSTICAS */}
        {activeTab === 'estadisticas' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Imprimir estadísticas
              </button>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-semibold text-slate-900">Incidentes por estado</h2>
                <p className="mt-1 text-sm text-slate-500">Distribución según el avance de atención.</p>
                <div className="mt-6 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byEstado} dataKey="value" nameKey="name" outerRadius={100} innerRadius={55} paddingAngle={4} label>
                        {byEstado.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {byEstado.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-sm font-medium text-slate-700">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-semibold text-slate-900">Incidentes por tipo</h2>
                <p className="mt-1 text-sm text-slate-500">Categorías más reportadas.</p>
                <div className="mt-6 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byTipo} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Group Modal */}
      {groupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Crear grupo</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedCount} incidentes seleccionados.</p>
              </div>
              <button onClick={() => setGroupModalOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">Título del grupo</label>
                <input
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="Ej: Incidentes de electricidad - Bloque A"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Incidentes a agrupar</p>
                <div className="space-y-2">
                  {selectedIncidents.map((inc) => (
                    <div key={inc.id} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                      <p className="font-semibold">{inc.titulo ?? inc.tipo}</p>
                      <p className="text-xs text-slate-400">{TIPO_LABELS[inc.tipo] ?? inc.tipo} · {getIncidentLocation(inc)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setGroupModalOpen(false)} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={handleCreateGroup} disabled={saving} className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400">
                {saving ? 'Creando...' : 'Crear grupo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
