import { createClient } from '@supabase/supabase-js';

// En Vite, las variables de entorno disponibles para el frontend
// deben iniciar obligatoriamente con VITE_.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

function maskKey(key: string | undefined | null) {
  if (!key) return null;
  if (key.length <= 12) return '•••';
  return `${key.slice(0, 6)}...${key.slice(-6)}`;
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

console.info('Supabase config:', {
  supabaseUrl: supabaseUrl ? supabaseUrl : null,
  supabaseAnonKey: supabaseAnonKey ? maskKey(supabaseAnonKey) : null
});

let supabase: any;

if (!isSupabaseConfigured) {
  console.error('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. Supabase client will be disabled.');

  const thrower = async () => {
    throw new Error('Supabase no está configurado. Crea el archivo .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY, y reinicia npm run dev.');
  };

  const chainableThrower = () => {
    throw new Error('Supabase no está configurado. Crea el archivo .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY, y reinicia npm run dev.');
  };

  // Cliente de respaldo para evitar errores como:
  // "supabase.auth.signInWithPassword is not a function".
  // Esto no permite iniciar sesión; solo muestra un error claro hasta que exista el .env.
  supabase = {
    from: () => ({
      select: chainableThrower,
      insert: chainableThrower,
      update: chainableThrower,
      delete: chainableThrower,
      eq: chainableThrower,
      order: chainableThrower
    }),
    rpc: thrower,
    storage: {
      from: () => ({
        upload: thrower,
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    },
    auth: {
      signInWithPassword: thrower,
      signUp: thrower,
      resetPasswordForEmail: thrower,
      signOut: thrower,
      getSession: thrower,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    }
  };
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

export { supabase };
