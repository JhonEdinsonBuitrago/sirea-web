import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Layers, MapPin, SearchCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminIncidentGroups } from '../../hooks/useAdminIncidentGroups';
import type { Incident } from '../../types';
import type { SimilarIncidentPair } from '../../utils/incidentSimilarity';


function formatDate(date?: string) {
  if (!date) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

function getIncidentLocation(incident: Incident) {
  return incident.salon || incident.ubicacion_texto || 'Ubicación no especificada';
}

function getScoreStyle(score: number) {
  if (score >= 80) return 'bg-rose-100 text-rose-700 ring-rose-200';
  if (score >= 65) return 'bg-amber-100 text-amber-700 ring-amber-200';
  return 'bg-sky-100 text-sky-700 ring-sky-200';
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Alta coincidencia';
  if (score >= 65) return 'Coincidencia media';
  return 'Coincidencia posible';
}

function buildSuggestedTitle(pair: SimilarIncidentPair) {
  const type = pair.primary.tipo || pair.duplicate.tipo || 'Incidente';
  const location = getIncidentLocation(pair.primary) !== 'Ubicación no especificada'
    ? getIncidentLocation(pair.primary)
    : getIncidentLocation(pair.duplicate);

  return `Posible duplicado: ${type}${location !== 'Ubicación no especificada' ? ` - ${location}` : ''}`;
}

function buildSuggestedDescription(pair: SimilarIncidentPair) {
  return [
    `Agrupación sugerida automáticamente con ${pair.score}% de similitud.`,
    `Criterios detectados: ${pair.reasons.join(', ')}.`,
    'El administrador debe confirmar que ambos reportes corresponden al mismo incidente antes de crear el grupo.'
  ].join('\n');
}

function IncidentMiniCard({ incident }: { incident: Incident }) {
  return (
    <div className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-start gap-3">
        {incident.imagen_url ? (
          <img src={incident.imagen_url} alt={incident.titulo ?? 'Incidente'} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Layers className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{incident.titulo ?? 'Incidente sin título'}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{incident.descripcion}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[0.70rem] font-semibold">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{incident.tipo}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 capitalize">{incident.estado.replace('_', ' ')}</span>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{getIncidentLocation(incident)}</span>
          </p>
          <p className="mt-1 text-[0.70rem] text-slate-400">{formatDate(incident.created_at)}</p>
        </div>
      </div>
    </div>
  );
}

export default function IncidentsAdmin() {
  const {
    incidents,
    loading,
    saving,
    selected,
    selectedCount,
    duplicateSuggestions,
    toggleSelection,
    clearSelection,
    selectIncidents,
    createGroup,
    syncGroupStatus
  } = useAdminIncidentGroups();

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const hasSelection = selectedCount > 0;
  const selectedIncidents = useMemo(
    () => incidents.filter((incident) => selected[incident.id]),
    [incidents, selected]
  );

  const groupedCount = useMemo(
    () => incidents.filter((incident) => incident.grupo_id || incident.group_id).length,
    [incidents]
  );

  const handleOpenGroupModal = () => {
    if (selectedCount < 2) {
      toast.error('Selecciona al menos 2 incidentes antes de agruparlos.');
      return;
    }
    setGroupModalOpen(true);
  };

  const handleOpenSuggestedGroup = (suggestion: SimilarIncidentPair) => {
    selectIncidents(suggestion.incidentIds);
    setGroupTitle(buildSuggestedTitle(suggestion));
    setGroupDescription(buildSuggestedDescription(suggestion));
    setGroupModalOpen(true);
    toast.info('Se seleccionaron las incidencias sugeridas para revisión.');
  };

  const handleCreateGroup = async () => {
    if (!groupTitle.trim()) {
      toast.error('Ingresa un título para el grupo.');
      return;
    }

    const { error } = await createGroup(groupTitle.trim(), groupDescription.trim());
    if (error) {
      toast.error(error.message || 'Error creando el grupo.');
      return;
    }

    toast.success('Grupo de incidentes creado correctamente.');
    setGroupModalOpen(false);
    setGroupTitle('');
    setGroupDescription('');
  };

  const handleGroupStatusChange = async (groupId: string, status: Incident['estado']) => {
    const { error } = await syncGroupStatus(groupId, status);
    if (error) {
      toast.error(error.message || 'No fue posible sincronizar el estado del grupo.');
      return;
    }
    toast.success('Estado del grupo sincronizado con los incidentes.');
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.35em] text-slate-500">Administración de incidentes</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">Agrupación inteligente de incidentes</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                El sistema analiza tipo, ubicación, fecha y palabras clave para sugerir reportes que podrían corresponder al mismo incidente. El administrador confirma la agrupación antes de sincronizar estados.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleOpenGroupModal}
                disabled={!hasSelection || saving}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Agrupar incidentes ({selectedCount})
              </button>
              <button
                type="button"
                onClick={() => clearSelection()}
                disabled={!hasSelection || saving}
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                Limpiar selección
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Incidentes totales</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{incidents.length}</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Agrupados</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{groupedCount}</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Posibles duplicados</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{duplicateSuggestions.length}</p>
          </div>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                <SearchCheck className="h-4 w-4" />
                Detección automática RF-10
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">Posibles incidencias duplicadas</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Estas sugerencias no agrupan automáticamente. Sirven para que el administrador revise, seleccione y confirme si los reportes pertenecen al mismo hecho.
              </p>
            </div>
            <div className="rounded-[24px] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              Umbral aplicado: 55% de similitud
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="h-60 animate-pulse rounded-[28px] bg-slate-100" />
              ))}
            </div>
          ) : duplicateSuggestions.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <p className="mt-3 text-sm font-semibold text-slate-900">No se detectaron posibles duplicados pendientes.</p>
              <p className="mt-1 text-sm text-slate-500">Cuando dos reportes tengan tipo, ubicación o descripción parecida, aparecerán aquí para revisión.</p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {duplicateSuggestions.map((suggestion) => (
                <article key={suggestion.id} className="rounded-[30px] border border-amber-100 bg-gradient-to-br from-white to-amber-50/40 p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ring-1 ${getScoreStyle(suggestion.score)}`}>
                        <AlertTriangle className="h-4 w-4" />
                        {getScoreLabel(suggestion.score)} · {suggestion.score}%
                      </span>
                      <h3 className="mt-3 text-lg font-semibold text-slate-900">Revisar posible agrupación</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenSuggestedGroup(suggestion)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
                    >
                      <Sparkles className="h-4 w-4" />
                      Agrupar sugeridos
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <IncidentMiniCard incident={suggestion.primary} />
                    <IncidentMiniCard incident={suggestion.duplicate} />
                  </div>

                  <div className="mt-4 rounded-[24px] bg-white/80 p-4 ring-1 ring-slate-200">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Razones de similitud</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {suggestion.reasons.map((reason) => (
                        <span key={reason} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Listado general de incidentes</h2>
              <p className="mt-1 text-sm text-slate-500">También puedes seleccionar manualmente reportes relacionados.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{selectedCount} seleccionados</span>
          </div>

          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-[28px] bg-slate-100" />
              ))
            ) : incidents.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No hay incidentes disponibles para administrar.
              </div>
            ) : (
              incidents.map((incident) => (
                <div key={incident.id} className="rounded-[32px] border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-slate-700 shadow-sm">
                          <input
                            type="checkbox"
                            checked={!!selected[incident.id]}
                            onChange={() => toggleSelection(incident.id)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                          />
                          Seleccionar
                        </label>
                        {(incident.group_id || incident.grupo_id) && (
                          <span className="rounded-full bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-700">Agrupado</span>
                        )}
                        {incident.incident_groups?.title && (
                          <span className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white">{incident.incident_groups.title}</span>
                        )}
                      </div>

                      <h2 className="text-xl font-semibold text-slate-900">{incident.titulo ?? 'Incidente sin título'}</h2>
                      <p className="text-sm text-slate-600">{incident.descripcion}</p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-3xl bg-white p-4 text-sm text-slate-700 shadow-sm">
                          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Tipo</p>
                          <p className="mt-2 font-semibold text-slate-900">{incident.tipo}</p>
                        </div>
                        <div className="rounded-3xl bg-white p-4 text-sm text-slate-700 shadow-sm">
                          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Estado</p>
                          <p className="mt-2 font-semibold text-slate-900 capitalize">{incident.estado.replace('_', ' ')}</p>
                        </div>
                        <div className="rounded-3xl bg-white p-4 text-sm text-slate-700 shadow-sm">
                          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Ubicación</p>
                          <p className="mt-2 font-semibold text-slate-900">{getIncidentLocation(incident)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-col gap-3 lg:w-72">
                      {incident.imagen_url && (
                        <img src={incident.imagen_url} alt={incident.titulo ?? 'Incidente'} className="h-40 w-full max-w-full rounded-3xl object-cover" />
                      )}
                      {(incident.group_id || incident.grupo_id) && incident.incident_groups && (
                        <div className="rounded-3xl bg-white p-4 text-sm text-slate-700 shadow-sm">
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Grupo</p>
                          <p className="mt-2 font-semibold text-slate-900">{incident.incident_groups.title ?? 'Grupo sin nombre'}</p>
                          <p className="mt-1 text-sm text-slate-500">{incident.incident_groups.description ?? 'Sin descripción del grupo'}</p>
                          <p className="mt-3 text-xs uppercase tracking-[0.3em] text-slate-500">Estado del grupo</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{incident.incident_groups.status.replace('_', ' ')}</span>
                            <button
                              type="button"
                              onClick={() => handleGroupStatusChange(incident.incident_groups!.id, incident.estado)}
                              className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                            >
                              Sincronizar estado
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {groupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl ring-1 ring-slate-200 sm:rounded-[32px] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Crear grupo de incidentes</h2>
                <p className="mt-2 text-sm text-slate-500">Asigna un título y descripción para el nuevo grupo. Se sincronizará el estado de todas las incidencias seleccionadas.</p>
              </div>
              <button
                type="button"
                onClick={() => setGroupModalOpen(false)}
                className="text-slate-400 transition hover:text-slate-700"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-8 grid gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Título del grupo</label>
                <input
                  value={groupTitle}
                  onChange={(event) => setGroupTitle(event.target.value)}
                  placeholder="Ej: Incidentes de electricidad - Bloque A"
                  className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Descripción</label>
                <textarea
                  value={groupDescription}
                  onChange={(event) => setGroupDescription(event.target.value)}
                  rows={4}
                  placeholder="Describe por qué estos incidentes deben tratarse juntos."
                  className="mt-3 w-full rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div className="rounded-[28px] bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Incidentes seleccionados</p>
                <p className="mt-2 text-sm text-slate-500">{selectedCount} incidentes serán agrupados.</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {selectedIncidents.map((incident) => (
                    <li key={incident.id} className="rounded-3xl bg-white p-3 shadow-sm">
                      <p className="font-semibold text-slate-900">{incident.titulo ?? 'Sin título'}</p>
                      <p className="text-slate-500">{incident.tipo} • {incident.estado.replace('_', ' ')} • {getIncidentLocation(incident)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setGroupModalOpen(false)}
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 sm:w-auto"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={saving}
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
              >
                Crear grupo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
