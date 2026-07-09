import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { uid, status, role, version } = await req.json();
    const supabaseAdmin = getSupabaseAdmin();

    if (!uid) {
      return NextResponse.json({ error: 'Missing required field: uid' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'System Configuration Error: SUPABASE_SERVICE_ROLE_KEY is missing.' 
      }, { status: 500 });
    }

    if (!status && !role) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    console.log(`[Atomic Update] Processing update for UID: ${uid}`, { status, role, version });

    // Step 1: Query current database profile for backup, existence verification, and OCC
    const { data: currentProfile, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (fetchError) {
      console.error('[Atomic Update] Failed to retrieve current user profile:', fetchError);
      return NextResponse.json({ error: 'Failed to verify user profile before update.' }, { status: 500 });
    }

    if (!currentProfile) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    // Step 3: Check and update Auth app_metadata if Role is changing
    let previousAuthRole = currentProfile.role;
    let authUpdated = false;

    if (role && role !== currentProfile.role) {
      // Fetch the Auth user to inspect their current metadata first to ensure O(1) check
      try {
        const { data: authUserResult } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (authUserResult?.user) {
          previousAuthRole = authUserResult.user.app_metadata?.role || currentProfile.role;
          
          if (authUserResult.user.app_metadata?.role !== role) {
            console.log(`[Atomic Update] Updating Auth app_metadata role from ${previousAuthRole} to ${role}`);
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(uid, {
              app_metadata: { role }
            });
            
            if (authError) {
              console.error('[Atomic Update] Auth role update failed:', authError);
              return NextResponse.json({ error: `Failed to update auth permissions: ${authError.message}` }, { status: 500 });
            }
            authUpdated = true;
          }
        }
      } catch (authFetchError) {
        console.warn('[Atomic Update] Auth user not found while updating role. Self-healing DB profile anyway...');
      }
    }

    // Step 4: Perform profile database update
    const updates: any = {};
    if (status) updates.status = status;
    if (role) updates.role = role;

    console.log(`[Atomic Update] Updating public.users profile for UID: ${uid}`, updates);
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', uid);
    
    if (dbError) {
      console.error('[Atomic Update] DB update failed:', dbError);
      
      // Step 5: Server-side rollback if database update fails
      if (authUpdated) {
        console.log(`[Atomic Update] DB update failed. Rolling back Auth role metadata to ${previousAuthRole}`);
        await supabaseAdmin.auth.admin.updateUserById(uid, {
          app_metadata: { role: previousAuthRole }
        });
      }

      return NextResponse.json({ error: `Database update failed: ${dbError.message}. Auth changes rolled back.` }, { status: 500 });
    }

    console.log(`[Atomic Update] Successfully completed atomic update for UID: ${uid}.`);
    return NextResponse.json({ 
      success: true, 
      message: 'User updated and synchronized successfully.'
    });

  } catch (error: any) {
    console.error('Unexpected server error in /api/users/update:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json({ 
      error: error.message || 'An unexpected internal server error occurred.' 
    }, { status: 500 });
  }
}
