import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'System Configuration Error: SUPABASE_SERVICE_ROLE_KEY is missing.' 
      }, { status: 500 });
    }

    // Fetch auth users and public users with individual error handling to prevent complete request failure
    const authResultPromise = supabaseAdmin.auth.admin.listUsers().catch(err => ({ error: err, data: { users: [] } }));
    const dbResultPromise = supabaseAdmin.from('users').select('*').order('created_at', { ascending: false });

    const [authResult, dbResult] = await Promise.all([authResultPromise, dbResultPromise]);

    if (authResult.error) {
      console.error('Error listing auth users (Sync might be limited):', authResult.error);
      // We don't return 500 here if DB fetch succeeded, we just skip sync
    }

    if (dbResult.error) {
      console.error('Error fetching public users from DB:', dbResult.error);
      return NextResponse.json({ error: 'Failed to fetch public users from database.' }, { status: 500 });
    }

    const authUsers = (authResult as any).data?.users || [];
    const publicUsers = dbResult.data || [];

    // Continuous Verification & Self-Healing Repair
    const repairs: Promise<any>[] = [];

    // Only attempt sync repairs if we successfully fetched auth users
    if (!authResult.error) {
      // Loop through auth users and verify their profile exists and role matches
      for (const authUser of authUsers) {
        const email = authUser.email;
        if (!email) continue;

        const profile = publicUsers.find(p => p.id === authUser.id);
        const authRole = authUser.app_metadata?.role || 'auditor';

        if (!profile) {
          // Step 2: Auth exists, profile missing -> Automatically recreate
          console.log(`Self-Healing: Recreating missing profile for user ${email}...`);
          repairs.push(
            supabaseAdmin.from('users').insert({
              id: authUser.id,
              email: email,
              display_name: authUser.user_metadata?.display_name || email.split('@')[0],
              role: authRole as any, // Cast to any to satisfy TS but rely on valid value
              status: 'active',
              is_verified: true,
              created_at: authUser.created_at || new Date().toISOString()
            })
          );
        } else if (profile.role !== authRole || profile.email !== email) {
          if (profile.role !== authRole) {
            console.log(`Self-Healing: Role mismatch found for ${email}. Profile Role: ${profile.role}, Auth Role: ${authRole}. Syncing Auth app_metadata to DB Profile...`);
            repairs.push(
              supabaseAdmin.auth.admin.updateUserById(authUser.id, {
                app_metadata: { role: profile.role }
              })
            );
          }
          if (profile.email !== email) {
            console.log(`Self-Healing: Email mismatch found for ${email}. Profile Email: ${profile.email}, Auth Email: ${email}. Updating DB Profile email...`);
            repairs.push(
              supabaseAdmin.from('users').update({
                email: email
              }).eq('id', authUser.id)
            );
          }
        }
      }
    }

    // Wait for all repairs to complete
    if (repairs.length > 0) {
      await Promise.all(repairs);
      // Re-fetch public users after repair
      const refreshedDb = await supabaseAdmin.from('users').select('*').order('created_at', { ascending: false });
      if (!refreshedDb.error && refreshedDb.data) {
        return NextResponse.json(refreshedDb.data);
      }
    }

    return NextResponse.json(publicUsers);

  } catch (error: any) {
    console.error('Unexpected error in /api/users listing & sync:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
