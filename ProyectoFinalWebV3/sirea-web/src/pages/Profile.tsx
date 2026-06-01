import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthProvider';
import { getAllIncidents } from '../services/incidents';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { Incident } from '../types';

export default function Profile() {
  const { profile } = useAuth();
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.nombre ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await getAllIncidents();
      if (!mounted) return;
      setIncidents(data ?? []);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setNameInput(profile?.nombre ?? '');
  }, [profile?.nombre]);

  const avatarUrl = profile?.imagen_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.nombre || 'Usuario')}&background=0ea5e9&color=ffffff&size=128`;

  const stats = useMemo(() => {
    if (!incidents || !profile) return null;

    const relevant = profile.rol === 'admin' ? incidents : incidents.filter((incident) => incident.usuario_id === profile.id);
    const total = relevant.length;
    const active = relevant.filter((incident) => incident.estado !== 'resuelto').length;

    const tipoCounts: Record<string, number> = {};
    relevant.forEach((incident) => {
      tipoCounts[incident.tipo] = (tipoCounts[incident.tipo] || 0) + 1;
    });

    const tipos = Object.entries(tipoCounts).sort((a, b) => b[1] - a[1]);
    const topTipo = tipos[0]?.[0] ?? '—';
    const topPercent = total > 0 ? Math.round((Number(tipos[0]?.[1] ?? 0) / total) * 100) : 0;

    return { total, active, topTipo, topPercent };
  }, [incidents, profile]);

  const handleSave = async () => {
    if (!profile) return;

    if (!nameInput.trim()) {
      toast.error('Ingresa un nombre válido.');
      return;
    }

    setSaving(true);

    try {
      let publicUrl = profile.imagen_url ?? null;

      if (file) {
        const path = `${profile.id}/${Date.now()}-${file.name}`;
        const upload = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: true });
        if (upload.error) throw upload.error;

        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        publicUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ nombre: nameInput.trim(), imagen_url: publicUrl })
        .eq('id', profile.id)
        .select();

      if (error) throw error;

      toast.success('Perfil actualizado');
      setEditing(false);
      setTimeout(() => window.location.reload(), 600);
    } catch (error: any) {
      console.error('Update profile error', error);
      toast.error(error?.message || 'Error actualizando perfil');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Cargando perfil...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setNameInput(profile.nombre ?? '');
              }}
              className="group relative mx-auto shrink-0 cursor-pointer md:mx-0"
              aria-label="Editar perfil"
            >
              <img
                src={avatarUrl}
                alt="Avatar del usuario"
                className="h-28 w-28 rounded-full object-cover shadow-sm ring-1 ring-slate-100 transition group-hover:opacity-80"
              />
              <div className="absolute bottom-0 right-0 rounded-full border border-slate-100 bg-white p-1 shadow transition group-hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
                </svg>
              </div>
            </button>

            <div className="min-w-0 flex-1 text-center md:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">Perfil</p>
              <h1 className="mt-3 break-words text-2xl font-semibold text-slate-900 sm:text-3xl">{profile.nombre ?? 'Usuario'}</h1>
              <p className="mt-2 break-all text-sm text-slate-500">{profile.email}</p>
              <span className="mt-3 inline-flex rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                {profile.rol === 'admin' ? 'Administrador' : 'Usuario'}
              </span>
            </div>

            <div className="rounded-3xl bg-slate-50 p-4 text-center text-sm text-slate-500 md:text-right">
              <p>Registrado el:</p>
              <p className="mt-1 font-semibold text-slate-900">{new Date(profile.created_at || '').toLocaleDateString()}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Total de reportes</p>
            <p className="mt-4 text-4xl font-semibold text-slate-900">{stats ? stats.total : '—'}</p>
            <p className="mt-3 text-sm text-slate-400">{profile.rol === 'admin' ? 'Todos los reportes' : 'Tus reportes'}</p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Investigaciones activas</p>
            <p className="mt-4 text-4xl font-semibold text-slate-900">{stats ? stats.active.toString().padStart(2, '0') : '—'}</p>
            <p className="mt-3 text-sm text-slate-400">{stats ? `${stats.active} casos en progreso` : '—'}</p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Categoría más reportada</p>
            <p className="mt-4 break-words text-2xl font-semibold text-slate-900">{stats ? stats.topTipo : '—'}</p>
            <p className="mt-3 text-sm text-slate-400">{stats ? `${stats.topPercent}% del total` : '—'}</p>
          </div>
        </section>

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:rounded-3xl">
              <div className="p-5 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">Editar perfil</h3>
                    <p className="mt-2 text-sm text-slate-500">Actualiza tu nombre y foto de perfil.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="mb-6 mt-6 flex justify-center">
                  <div className="relative">
                    <img
                      src={file ? URL.createObjectURL(file) : avatarUrl}
                      alt="Vista previa del perfil"
                      className="h-24 w-24 rounded-full object-cover ring-2 ring-slate-100"
                    />
                    <div className="absolute bottom-0 right-0 rounded-full bg-sky-600 p-1.5 text-white shadow">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 19.414l-6.707-6.707a1 1 0 0 1 1.414-1.414L9 16.586l12.293-12.293a1 1 0 1 1 1.414 1.414L10.414 18z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Nombre completo</label>
                  <input
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="Tu nombre"
                  />
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Foto de perfil</label>
                  <label className="flex w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-4 py-4 transition hover:border-sky-500 hover:bg-sky-50">
                    <div className="flex min-w-0 flex-col items-center justify-center text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="mb-1 h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="max-w-full break-all text-sm font-medium text-slate-600">{file ? file.name : 'Selecciona una imagen'}</span>
                    </div>
                    <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="hidden" />
                  </label>
                </div>

                <div className="grid gap-3 sm:flex sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 sm:w-auto"
                    disabled={saving}
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
