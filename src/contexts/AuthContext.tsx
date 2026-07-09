'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateProfilePhoto: (photoURL: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true, 
  logout: async () => {},
  updateProfilePhoto: async () => {} 
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
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

  const getRoleForEmail = (email?: string): UserRole => {
    if (!email) return 'viewer';
    const e = email.toLowerCase();
    if (
      e === 'admin@ridm.system' || 
      e === 'ridmsfs@ridm.system' || 
      e === 'ridmacademy@gmail.com' || 
      e === 'abdul7777871234@gmail.com'
    ) {
      return 'super_admin';
    }
    return 'viewer';
  };

  const getDisplayNameForEmail = (email?: string): string => {
    if (!email) return 'User';
    const e = email.toLowerCase();
    if (e === 'ridmsfs@ridm.system') return 'RIDM SFS Admin';
    if (e === 'admin@ridm.system') return 'Admin';
    return email.split('@')[0];
  };

  const fetchProfile = async (user: User) => {
    setLoading(true);
    const fallbackProfile: UserProfile = {
      uid: user.id,
      email: user.email || '',
      displayName: getDisplayNameForEmail(user.email),
      role: getRoleForEmail(user.email),
      status: 'active',
      isVerified: true,
      createdAt: Date.now(),
    };

    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (error) {
        if (error.code !== 'PGRST116') {
          console.warn('Supabase profile query returned non-critical status:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
        }

        if (error.code === 'PGRST116') {
          console.log('User profile not found in users table, creating a default profile for session.');
          
          const profileRole = getRoleForEmail(user.email);
          const profileDisplayName = getDisplayNameForEmail(user.email);

          const { data: newData, error: insertError } = await supabase.from('users').insert({
              id: user.id,
              email: user.email,
              display_name: profileDisplayName,
              role: profileRole,
              status: 'active',
              is_verified: true,
              created_at: Date.now(),
          }).select().single();
          
          if (insertError) {
              console.warn('Supabase profile creation returned non-critical status:', {
                message: insertError.message,
                code: insertError.code,
                details: insertError.details,
                hint: insertError.hint
              });
              console.warn('Falling back to local in-memory profile due to insert failure.');
              setProfile(fallbackProfile);
          } else {
              setProfile({
                uid: newData.id,
                email: newData.email,
                displayName: newData.display_name,
                role: newData.role as UserRole,
                status: newData.status,
                isVerified: newData.is_verified,
                createdAt: newData.created_at,
                photoURL: newData.photo_url,
              });
          }
        } else {
          console.warn('Falling back to local in-memory profile due to query error.');
          setProfile(fallbackProfile);
        }
      } else {
        setProfile({
          uid: data.id,
          email: data.email,
          displayName: data.display_name,
          role: data.role as UserRole,
          status: data.status,
          isVerified: data.is_verified,
          createdAt: data.created_at,
          photoURL: data.photo_url,
        });
      }
    } catch (err) {
      console.error('Uncaught error in fetchProfile catch block:', err);
      setProfile(fallbackProfile);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const updateProfilePhoto = async (photoURL: string) => {
    // Implementation can be moved to Supabase storage in the future
    console.warn('updateProfilePhoto needs migration to Supabase');
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, updateProfilePhoto }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
