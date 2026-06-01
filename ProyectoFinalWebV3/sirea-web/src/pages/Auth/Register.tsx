import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

const schema = z
  .object({
    nombre: z.string().min(2, 'Ingrese su nombre completo'),
    email: z.string().email('Ingrese un correo válido').refine((value) => value.endsWith('@uniamazonia.edu.co'), {
      message: 'Solo se permiten correos @uniamazonia.edu.co'
    }),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirme su contraseña'),
    terms: z.literal(true, {
      errorMap: () => ({ message: 'Debe aceptar los términos de servicio' })
    })
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden'
  });

type FormData = z.infer<typeof schema>;

export default function Register() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { terms: false } as unknown as FormData
  });
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { 
        data: { nombre: data.nombre, role: 'usuario' },
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Cuenta creada exitosamente. Redirigiendo...');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-sky-100 flex items-center justify-center py-10">
      <div className="w-full max-w-3xl px-4">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-sky-900 text-white shadow-lg mx-auto">
            <User className="w-7 h-7" />
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">Uniamazonia Report</h1>
          <p className="mt-2 text-sm text-slate-500">Regístrate con tus credenciales institucionales para reportar incidentes.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-[28px] border border-slate-200 shadow-xl p-8">
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nombre Completo</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  {...register('nombre')}
                  placeholder="Ej. Juan Pérez"
                  className="w-full border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              {errors.nombre && <p className="mt-2 text-sm text-rose-600">{errors.nombre.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Correo Institucional</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  {...register('email')}
                  placeholder="usuario@uniamazonia.edu.co"
                  className="w-full border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              {errors.email && <p className="mt-2 text-sm text-rose-600">{errors.email.message}</p>}
              <p className="mt-2 text-xs text-slate-400">Solo se permiten correos @uniamazonia.edu.co</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Contraseña</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    placeholder="********"
                    className="w-full border border-slate-200 rounded-xl py-3 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-2 text-sm text-rose-600">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Confirmar</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    {...register('confirmPassword')}
                    placeholder="********"
                    className="w-full border border-slate-200 rounded-xl py-3 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-2 text-sm text-rose-600">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            <label className="inline-flex items-start gap-3 text-sm text-slate-700">
              <input type="checkbox" {...register('terms')} className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
              <span>
                Acepto los <span className="font-semibold text-slate-900">Términos de Servicio</span> y la <span className="font-semibold text-slate-900">Política de Privacidad</span> de la Universidad.
              </span>
            </label>
            {errors.terms && <p className="text-sm text-rose-600">{errors.terms.message}</p>}

            <button className="w-full rounded-2xl bg-sky-900 py-4 text-white text-base font-semibold shadow-lg transition hover:bg-sky-800">
              Crear Cuenta
            </button>

            <p className="text-center text-sm text-slate-500">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/auth/login" className="font-semibold text-sky-600 hover:text-sky-700">
                Inicia Sesión
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
