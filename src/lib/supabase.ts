import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://epwihiscgahxxhfmlrqn.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwd2loaXNjZ2FoeHhoZm1scnFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MTgyNzIsImV4cCI6MjA5OTA5NDI3Mn0.nbXMqbcjHQVPZFseBsTEHif7Z0KMGjNV7wwTyad6Jsc';

console.log('Supabase initialized with URL:', supabaseUrl);

// If Supabase is not configured, provide a mock client that satisfies the interface
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : ({
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => {},
        signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      },
      from: (table: string) => ({
        select: () => ({ data: [], error: { message: 'Supabase not configured' } }),
        insert: () => ({ error: { message: 'Supabase not configured' } }),
        update: () => ({ error: { message: 'Supabase not configured' } }),
        delete: () => ({ error: { message: 'Supabase not configured' } }),
        eq: () => ({ 
           select: () => ({ data: [], error: { message: 'Supabase not configured' } }),
           single: () => ({ data: null, error: { message: 'Supabase not configured' } }),
           update: () => ({ error: { message: 'Supabase not configured' } }),
           delete: () => ({ error: { message: 'Supabase not configured' } })
        })
      }),
      storage: {},
    } as any);
