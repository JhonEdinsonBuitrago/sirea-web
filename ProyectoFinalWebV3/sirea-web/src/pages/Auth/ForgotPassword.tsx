import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const schema = z.object({
  email: z.string().email()
});

export default function ForgotPassword() {
  const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data: any) => {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Revisa tu email para restablecer la contraseña');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Recuperar contraseña</h2>
        <label className="block">Email</label>
        <input {...register('email')} className="w-full border p-2 rounded mb-3" />
        <button className="w-full bg-sky-600 text-white p-2 rounded">Enviar enlace</button>
      </form>
    </div>
  );
}
