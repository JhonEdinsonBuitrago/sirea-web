import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';
import type { User, Session } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  logout: () => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  profileLoading: false,
  logout: async () => ({ error: null })
});

async function fetchOrCreateProfile(
  user: User,
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>,
  setProfileLoading: React.Dispatch<React.SetStateAction<boolean>>,
  mountedRef: React.MutableRefObject<boolean>
) {
  if (!mountedRef.current) return;
  setProfileLoading(true);

  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!mountedRef.current) return;

    if (profileError) {
      console.error('Error fetching profile', profileError);
      setProfile(null);
      return;
    }

    if (profileData) {
      setProfile(profileData as Profile);
      return;
    }

    const metadata = user.user_metadata as Record<string, any> | null;
    const insertPayload = {
      id: user.id,
      email: user.email,
      nombre: metadata?.nombre ?? user.email,
      rol: metadata?.role ?? 'usuario'
    };

    const { error: insertError } = await supabase.from('profiles').insert(insertPayload, { returning: 'minimal' });

    if (!mountedRef.current) return;

    if (insertError) {
      console.error('Error creating profile', insertError);
      setProfile(null);
      return;
    }

    const { data: profileAfterInsert, error: profileAfterInsertError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!mountedRef.current) return;

    if (profileAfterInsertError) {
      console.error('Error fetching profile after insert', profileAfterInsertError);
      setProfile(null);
      return;
    }

    setProfile(profileAfterInsert as Profile);
  } finally {
    if (mountedRef.current) {
      setProfileLoading(false);
    }
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const clearSession = async () => {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.warn('Failed to clear invalid auth session', error);
      } finally {
        if (mountedRef.current) {
          setUser(null);
          setProfile(null);
          setProfileLoading(false);
        }
      }
    };

    const initializeAuth = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

        if (error) {
          console.warn('Supabase getSession error', error);
          await clearSession();
          return;
        }

        const sessionUser = data?.session?.user ?? null;
        setUser(sessionUser);

        if (sessionUser) {
          fetchOrCreateProfile(sessionUser, setProfile, setProfileLoading, mountedRef);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Auth initialization error', error);
        await clearSession();
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data } = supabase.auth.onAuthStateChange(async (_event: string, session: Session | null) => {
      if (!mountedRef.current) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        setProfileLoading(false);
        setLoading(false);
        return;
      }

      setLoading(false);
      fetchOrCreateProfile(currentUser, setProfile, setProfileLoading, mountedRef);
    });

    return () => {
      mountedRef.current = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setProfileLoading(false);
      return { error };
    } catch (error) {
      console.error('Logout error', error);
      return { error: error as Error };
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
