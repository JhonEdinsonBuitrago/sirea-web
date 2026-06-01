import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Building, Droplet, MapPin, Save, Shield, Sparkles, Zap, ArrowRight, UploadCloud } from 'lucide-react';
import { useAuth } from '../../context/AuthProvider';
import { createIncident } from '../../services/incidents';

const schema = z.object({
  titulo: z.string().min(5, 'Ingrese un título para el incidente'),
  tipo: z.string().min(1, 'Seleccione el tipo de incidente'),
  descripcion: z.string().min(10, 'Describe el problema con mayor detalle'),
  salon: z.string().optional(),
  ubicacion_texto: z.string().optional()
});

type FormData = z.infer<typeof schema>;

const incidentOptions = [
  { label: 'Baño', value: 'bano', icon: Droplet },
  { label: 'Electricidad', value: 'electricidad', icon: Zap },
  { label: 'Infraestructura', value: 'infraestructura', icon: Building },
  { label: 'Seguridad', value: 'seguridad', icon: Shield },
  { label: 'Otro', value: 'otro', icon: Sparkles }
];

export default function NewIncident() {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'infraestructura' }
  });

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<string>('Presiona el botón para obtener tu ubicación GPS.');
  const { user } = useAuth();

  const selectedType = watch('tipo');

  const onSubmit = async (data: FormData) => {
    if (!file) {
      toast.error('Adjunta una imagen del incidente para continuar');
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Solo se permiten imágenes JPG, PNG o WEBP');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no debe superar 10 MB');
      return;
    }

    if (!user) {
      toast.error('No se encontró sesión de usuario. Por favor, inicia sesión de nuevo.');
      return;
    }

    setLoading(true);

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const uid = user.id;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reports')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
          metadata: { owner: uid, 'content-type': file.type }
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('reports').getPublicUrl(uploadData.path);
      const ubicacionText =
        data.ubicacion_texto ||
        (location ? `GPS: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : data.salon ?? '');

      const { error } = await createIncident({
        usuario_id: uid,
        titulo: data.titulo,
        tipo: data.tipo,
        descripcion: data.descripcion,
        imagen_url: publicUrl.publicUrl,
        ubicacion_texto: ubicacionText,
        salon: data.salon ?? null,
        latitud: location?.lat ?? null,
        longitud: location?.lng ?? null
      });

      if (error) throw error;

      toast.success('Incidente reportado correctamente');
    } catch (error: any) {
      toast.error(error?.message || 'No fue posible registrar el incidente');
    } finally {
      setLoading(false);
    }
  };

  const requestGpsLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Geolocalización no soportada en este navegador.');
      return;
    }

    setGeoStatus('Obteniendo ubicación...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGeoStatus(`Ubicación GPS obtenida: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
      },
      (error) => {
        setGeoStatus(`Error al obtener GPS: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 sm:text-sm">Nuevo reporte</p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Reportar incidente</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Complete la información del incidente, registre la ubicación y adjunte una evidencia fotográfica para iniciar el seguimiento institucional.
              </p>
            </div>

            <div className="grid gap-3 sm:flex sm:flex-row">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
              >
                <Save className="mr-2 h-4 w-4" />
                Guardar borrador
              </button>
              <button
                type="submit"
                form="new-incident-form"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
              >
                {loading ? 'Enviando...' : 'Enviar reporte'}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <form id="new-incident-form" onSubmit={handleSubmit(onSubmit)} className="grid min-w-0 gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="min-w-0 space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Información básica</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Describe el incidente de forma clara para que el equipo institucional pueda priorizarlo.</p>
              </div>

              <div className="mt-6 space-y-6 sm:mt-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Título del incidente</label>
                  <input
                    {...register('titulo')}
                    placeholder="Ej: Fuga de agua en Laboratorio 3"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                  />
                  {errors.titulo && <p className="mt-2 text-sm text-rose-600">{errors.titulo.message}</p>}
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700">Tipo de incidente</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {incidentOptions.map((option) => {
                      const Icon = option.icon;
                      const active = selectedType === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setValue('tipo', option.value, { shouldValidate: true })}
                          className={`min-w-0 rounded-3xl border px-4 py-4 text-left transition ${
                            active
                              ? 'border-sky-500 bg-sky-50 text-slate-900 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3 text-slate-800">
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="truncate text-sm font-semibold">{option.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {errors.tipo && <p className="mt-2 text-sm text-rose-600">{errors.tipo.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Descripción detallada</label>
                  <textarea
                    {...register('descripcion')}
                    placeholder="Describa el problema con el mayor detalle posible..."
                    rows={7}
                    className="mt-3 w-full resize-y rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                  />
                  {errors.descripcion && <p className="mt-2 text-sm text-rose-600">{errors.descripcion.message}</p>}
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Evidencia fotográfica</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Adjunte una imagen del incidente para agilizar la evaluación.</p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 sm:text-sm">JPG, PNG o WEBP • 10 MB</span>
              </div>

              <label htmlFor="upload" className="mt-6 flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-slate-500 transition hover:border-slate-400 hover:bg-slate-100 sm:min-h-[220px]">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-slate-700 shadow-sm">
                  <UploadCloud className="h-6 w-6" />
                </span>
                <span className="mt-4 text-sm font-semibold text-slate-900">Haz clic para subir la evidencia</span>
                <span className="mt-2 max-w-xs text-xs leading-5 text-slate-400 sm:text-sm">En móvil puedes seleccionar una foto de tu galería o tomar una nueva desde la cámara.</span>
                <input
                  id="upload"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>

              {file && (
                <div className="mt-4 min-w-0 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Archivo seleccionado: <span className="break-all font-semibold">{file.name}</span>
                </div>
              )}
            </section>
          </div>

          <aside className="min-w-0 space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-3xl bg-sky-100 text-sky-700">
                  <MapPin className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-slate-900">Ubicación exacta</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Registra el salón, punto específico o coordenadas GPS.</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Salón o punto específico</label>
                  <input
                    {...register('salon')}
                    placeholder="Ej: Aula 204, Pasillo B"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Ubicación textual adicional</label>
                  <input
                    {...register('ubicacion_texto')}
                    placeholder="Ej: segundo piso, cerca a la escalera"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                  />
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-medium text-slate-700">Geolocalización GPS</p>
                  <button
                    type="button"
                    onClick={requestGpsLocation}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <MapPin className="h-4 w-4" />
                    Usar GPS
                  </button>

                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">Estado de ubicación</p>
                    <p className="mt-2 break-words text-sm leading-6 text-slate-500">{geoStatus}</p>
                    {location && (
                      <p className="mt-3 break-words text-sm text-slate-600">
                        Coordenadas: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-3xl bg-slate-100 text-slate-700">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-slate-900">Prioridad del sistema</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">La prioridad se determinará durante el seguimiento del reporte.</p>
                </div>
              </div>
            </section>
          </aside>
        </form>
      </div>
    </div>
  );
}
