import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://epwihiscgahxxhfmlrqn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: 'Missing required field: uid' }, { status: 400 });
    }

    if (supabaseAdmin) {
      console.log('Using Supabase Admin to delete user from Auth:', uid);
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(uid);
      if (authError) {
        console.warn('Supabase Admin deleteUser returned status/error:', authError);
        // We will not fail the whole request since the user might only exist in the public "users" table
      } else {
        console.log('Successfully deleted user from Auth');
      }
    } else {
      console.log('Supabase Admin key not found, skipping Auth deletion');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user in Auth API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
