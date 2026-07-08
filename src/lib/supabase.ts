import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('Supabase initialized with URL:', supabaseUrl);

// If Supabase is not configured, provide a mock client that satisfies the interface
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
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
