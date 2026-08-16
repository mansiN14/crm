import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { FirebaseSession, User } from '../lib/supabase';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<FirebaseSession | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }
    return data;
  }, []);

  const refreshUser = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user) {
      const userData = await fetchUser(currentSession.user.id);
      setUser(userData);
      setSession(currentSession);
    }
  }, [fetchUser]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted && initialSession?.user) {
          const userData = await fetchUser(initialSession.user.id);
          setUser(userData);
          setSession(initialSession);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && newSession?.user) {
        (async () => {
          const userData = await fetchUser(newSession.user.id);
          if (mounted) {
            setUser(userData);
            setSession(newSession);
          }
        })();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUser]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };

      const { user, session } = data;
      if (user && session) {
        const userData = await fetchUser(user.id);
        setUser(userData);
        setSession(session);
      }
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error };

      if (data.user) {
        await supabase.from('users').insert({
          id: data.user.id,
          name,
          email,
          role: role as User['role'],
          is_active: true,
        });
        const userData = await fetchUser(data.user.id);
        setUser(userData);
        setSession(data.session);
      }
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!user?.email) return { error: new Error('Unable to confirm the current user email.') };

    try {
      const { error } = await supabase.auth.updatePassword({
        email: user.email,
        currentPassword,
        newPassword,
      });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
