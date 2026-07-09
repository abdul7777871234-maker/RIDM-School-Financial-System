import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json();
    const supabaseAdmin = getSupabaseAdmin();

    if (!uid) {
      return NextResponse.json({ error: 'Missing required field: uid' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'System Configuration Error: SUPABASE_SERVICE_ROLE_KEY is missing.' 
      }, { status: 500 });
    }

    console.log(`[Atomic Delete] Commencing deletion workflow for user UID: ${uid}`);

    // Step 1: Query and backup profile from public.users before taking any action
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    
    if (fetchError) {
      console.error('[Atomic Delete] Failed to fetch user profile before deletion:', fetchError);
      return NextResponse.json({ error: 'Failed to verify user profile before deletion.' }, { status: 500 });
    }

    // If profile is missing, check if the auth user still exists
    if (!profile) {
      console.log(`[Atomic Delete] Profile record is already absent. Checking if orphaned Auth account exists...`);
      let authUserExists = false;
      try {
        const { data: authUserResult } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (authUserResult?.user) {
          authUserExists = true;
        }
      } catch (e) {
        // Auth user not found is expected if already deleted
      }

      if (authUserExists) {
        console.log(`[Atomic Delete] Orphaned Auth account found. Removing it...`);
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(uid);
        if (authDeleteError && authDeleteError.status !== 404) {
          console.error('[Atomic Delete] Failed to delete orphaned Auth user:', authDeleteError);
          return NextResponse.json({ error: `Failed to delete orphaned Auth user: ${authDeleteError.message}` }, { status: 500 });
        }
      }

      console.log(`[Atomic Delete] Idempotent Delete complete (User already fully deleted).`);
      return NextResponse.json({ success: true, message: 'User already deleted.' });
    }

    // Step 2: Delete profile from database first (Workflow Step 1)
    console.log(`[Atomic Delete] Workflow Step 1: Deleting public.users profile for UID: ${uid}`);
    const { error: dbDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', uid);
    
    if (dbDeleteError) {
      console.error('[Atomic Delete] Profile deletion failed:', dbDeleteError);
      return NextResponse.json({ error: `Database profile deletion failed: ${dbDeleteError.message}. Auth credentials untouched.` }, { status: 500 });
    }

    // Step 3: Delete Auth Account (Workflow Step 2)
    console.log(`[Atomic Delete] Workflow Step 2: Deleting auth.users account for UID: ${uid}`);
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(uid);

    if (authDeleteError) {
      // Check if the user is already absent in Auth. If they don't exist, we don't rollback since our goal is accomplished.
      const isUserNotFoundInAuth = authDeleteError.status === 404 || authDeleteError.message?.toLowerCase().includes('not found');
      
      if (isUserNotFoundInAuth) {
        console.log(`[Atomic Delete] Auth account was already missing. Concluding workflow successfully.`);
        return NextResponse.json({ success: true, message: 'User deleted and synchronized successfully.' });
      }

      console.error('[Atomic Delete] Auth deletion failed. Commencing Server-Side Rollback...', authDeleteError);

      // Workflow Step 3: Rollback by re-inserting the backed-up profile
      const { error: restoreError } = await supabaseAdmin.from('users').insert(profile);
      if (restoreError) {
        console.error('[Atomic Delete] CRITICAL: Rollback failed! Database profile could not be restored:', restoreError);
        return NextResponse.json({ 
          error: `Failed to delete auth user: ${authDeleteError.message}. Database rollback also failed: ${restoreError.message}. System is now inconsistent.` 
        }, { status: 500 });
      }

      console.log('[Atomic Delete] Rollback completed successfully. User profile restored.');
      return NextResponse.json({ error: `Failed to delete authentication credentials: ${authDeleteError.message}. Database deletion was rolled back.` }, { status: 500 });
    }

    console.log(`[Atomic Delete] Workflow complete. User fully deleted and synchronized.`);
    return NextResponse.json({ success: true, message: 'User deleted and synchronized successfully.' });

  } catch (error: any) {
    console.error('Unexpected server error in /api/users/delete:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json({ 
      error: error.message || 'An unexpected internal server error occurred.' 
    }, { status: 500 });
  }
}
