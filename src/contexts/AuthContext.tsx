'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateProfilePhoto: (photoURL: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true, 
  logout: async () => {},
  updateProfilePhoto: async () => {},
  refreshSession: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session retrieval error:', {
           message: error.message,
           status: error.status
        });
      }
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user);
      }
    } catch (err: any) {
      console.error('Failed to refresh session:', { message: err.message, status: err.status });
    }
  };

  const fetchProfile = async (user: User) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();
      
      // JWT source of truth for Role
      const jwtRole = (user.app_metadata?.role as UserRole) || 'student';
      const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';

      if (error) {
        console.warn('Resilient fallback active: Supabase profile query had an error or profile was missing. Relying on JWT claims.', { 
          message: error.message, 
          code: error.code,
          uid: user.id 
        });
        setProfile({
          uid: user.id,
          email: user.email || '',
          displayName: displayName,
          role: jwtRole,
          status: 'active',
          isVerified: true,
          createdAt: Date.now(),
        });
      } else {
        // We have data from public.users
        if (data.status === 'inactive') {
          console.warn('Access Revoked: User account is inactive. Initiating forced logout.', { uid: user.id });
          await supabase.auth.signOut();
          setProfile(null);
          setUser(null);
          setLoading(false);
          return;
        }

        setProfile({
          uid: data.id,
          email: data.email,
          displayName: data.display_name,
          role: jwtRole, // ALWAYS use JWT role as source of truth for UI permissions to prevent UI/DB mismatches
          status: data.status,
          isVerified: data.is_verified,
          createdAt: new Date(data.created_at).getTime(),
          photoURL: data.photo_url,
        });
      }
    } catch (error: any) {
      console.error('Uncaught error in fetchProfile:', { message: error.message, stack: error.stack });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const updateProfilePhoto = async (photoURL: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('users').update({ photo_url: photoURL }).eq('id', user.id);
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, photoURL } : null);
    } catch (error: any) {
      console.error('Error updating profile photo:', { message: error.message, code: error.code });
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, updateProfilePhoto, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
