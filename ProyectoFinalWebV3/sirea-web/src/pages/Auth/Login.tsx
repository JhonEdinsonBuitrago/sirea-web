import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export default function Login() {
  const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) });
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (data: any) => {
    setSubmitting(true);

    if (!isSupabaseConfigured) {
      toast.error('Supabase no está configurado. Crea el archivo .env y reinicia el servidor de desarrollo.');
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Bienvenido de nuevo');
      navigate('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-slate-50 py-12">
      <div className="w-full max-w-md px-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-sky-800 text-white rounded-lg flex items-center justify-center shadow">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h4l3 8 4-16 3 8h4" />
            </svg>
          </div>
          <h1 className="mt-4 text-lg font-semibold text-slate-900">Uniamazonia Report</h1>
          <p className="text-sm text-slate-500">Portal Institucional de Transparencia</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow p-6">
          <label className="block text-sm text-slate-600">Correo Electrónico</label>
          <div className="mt-2 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Mail className="w-4 h-4" />
            </span>
            <input
              {...register('email')}
              placeholder="ejemplo@uniamazonia.edu.co"
              className="w-full border border-slate-200 rounded-md py-3 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <label className="block text-sm text-slate-600">Contraseña</label>
            <Link to="/auth/forgot-password" className="text-sm text-sky-600">¿Olvidó su contraseña?</Link>
          </div>

          <div className="mt-2 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type={showPwd ? 'text' : 'password'}
              {...register('password')}
              className="w-full border border-slate-200 rounded-md py-3 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">
              {showPwd ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <label className="inline-flex items-center text-sm text-slate-600">
              <input type="checkbox" className="form-checkbox h-4 w-4 text-sky-600" />
              <span className="ml-2">Recordar mi sesión</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`mt-6 w-full rounded-lg py-3 flex items-center justify-center gap-2 text-white transition ${submitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-sky-800 hover:bg-sky-900'}`}
          >
            {submitting ? 'Ingresando...' : 'Entrar al Sistema'}
            {!submitting && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            )}
          </button>

          <div className="mt-6 text-center text-sm text-slate-500">
            ¿No tiene una cuenta? <Link to="/auth/register" className="text-sky-600">Crear cuenta</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
