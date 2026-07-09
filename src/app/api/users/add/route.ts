import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://epwihiscgahxxhfmlrqn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Optional admin client if service role key is available
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
    const { username, email, role, password } = await req.json();

    const userEmail = email || (username && (username.includes('@') ? username : `${username.toLowerCase()}@ridm.system`));

    if (!userEmail || !role || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let uid = '';
    let createdInAuth = false;

    if (supabaseAdmin) {
      console.log('Using Supabase Admin to register user in Auth');
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        password: password,
        email_confirm: true,
        user_metadata: { role }
      });

      if (authError) {
        console.error('Supabase Admin createUser error:', authError);
        if (authError.message.includes('already registered') || authError.status === 422) {
          return NextResponse.json({ 
            error: 'User is already registered in Supabase Auth' 
          }, { status: 400 });
        }
        throw new Error(authError.message);
      }

      if (authData?.user) {
        uid = authData.user.id;
        createdInAuth = true;
        console.log('Successfully created user in Auth with UUID:', uid);
      }
    } else {
      console.log('Supabase Admin key not found, generating a random UUID for the profile table');
      // Generate a valid UUID-v4-like string so it matches the UUID column requirement in Supabase "users" table
      uid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    return NextResponse.json({ 
      success: true, 
      uid,
      email: userEmail,
      createdInAuth
    });
  } catch (error: any) {
    console.error('Error adding user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
