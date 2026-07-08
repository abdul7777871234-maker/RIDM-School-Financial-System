'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '@/types';
import { isConvexConfigured } from '@/lib/convex';

interface AuthContextType {
  user: any;
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
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof window !== 'undefined') {
        const localSess = localStorage.getItem('ridm_local_session');
        if (localSess) {
          try {
            const parsed = JSON.parse(localSess);
            if (parsed && parsed.email) {
              const suffix = isConvexConfigured() ? '' : ' (Offline Mode)';
              const displayName = parsed.displayName ? parsed.displayName.replace(' (Offline Mode)', '') + suffix : parsed.email.split('@')[0] + suffix;
              
              setUser({
                uid: parsed.uid || 'admin',
                email: parsed.email,
                displayName: displayName,
                emailVerified: true,
                photoURL: parsed.photoURL || undefined
              });
              setProfile({
                uid: parsed.uid || 'admin',
                email: parsed.email,
                displayName: displayName,
                role: parsed.role || 'super_admin',
                status: 'active',
                isVerified: true,
                createdAt: parsed.createdAt || Date.now(),
                photoURL: parsed.photoURL || undefined
              });
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Failed parsing local session:', e);
          }
        }
      }

      setUser(null);
      setProfile(null);
      setLoading(false);
    };

    initAuth();
  }, []);

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ridm_local_session');
    }
    setUser(null);
    setProfile(null);
  };

  const updateProfilePhoto = async (photoURL: string) => {
    if (typeof window !== 'undefined') {
      const localSess = localStorage.getItem('ridm_local_session');
      if (localSess) {
        try {
          const parsed = JSON.parse(localSess);
          parsed.photoURL = photoURL;
          localStorage.setItem('ridm_local_session', JSON.stringify(parsed));
          
          setUser((prev: any) => prev ? { ...prev, photoURL } : null);
          setProfile((prev: any) => prev ? { ...prev, photoURL } : null);
          
          // Also update it in the ridm_users central storage if this user exists there
          const storedUsersStr = localStorage.getItem('ridm_users');
          if (storedUsersStr) {
            const users = JSON.parse(storedUsersStr);
            const index = users.findIndex((u: any) => u.email === parsed.email || u.uid === parsed.uid);
            if (index !== -1) {
              users[index].photoURL = photoURL;
              localStorage.setItem('ridm_users', JSON.stringify(users));
            }
          }
          
          window.dispatchEvent(new Event('profile-updated'));
        } catch (e) {
          console.error('Error updating profile photo:', e);
        }
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, updateProfilePhoto }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
