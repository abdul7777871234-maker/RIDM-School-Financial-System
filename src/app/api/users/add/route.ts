import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { username, email, role, password, requesterUid } = await req.json();
    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'System Configuration Error: SUPABASE_SERVICE_ROLE_KEY is missing.' 
      }, { status: 500 });
    }

    // Verify requester is a super_admin
    if (!requesterUid) {
      return NextResponse.json({ error: 'Unauthorized: Requester identification missing.' }, { status: 401 });
    }

    const { data: requesterProfile, error: requesterError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', requesterUid)
      .single();

    if (requesterError || requesterProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized: Only Super Admins can create accounts.' }, { status: 403 });
    }

    const userEmail = email || (username && (username.includes('@') ? username : `${username.toLowerCase()}@ridm.system`));

    if (!userEmail || !role || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedEmail = userEmail.toLowerCase();
    console.log(`[Atomic Add] Processing user: ${normalizedEmail} with role: ${role}`);

    // Step 1: Perform concurrent O(1) lookups for the auth user and public profile
    let authUser = null;
    try {
      const { data: authData, error: authFetchError } = await supabaseAdmin.auth.admin.getUserByEmail(normalizedEmail);
      if (!authFetchError && authData?.user) {
        authUser = authData.user;
      }
    } catch (e) {
      console.log(`[Atomic Add] Note: Auth user lookup generated an exception (likely doesn't exist yet).`);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error('[Atomic Add] Error querying database profile:', profileError);
      return NextResponse.json({ error: 'Failed to query existing database profile' }, { status: 500 });
    }

    // ==========================================
    // CASE A: Both exist (Already exists)
    // ==========================================
    if (authUser && profile) {
      // Check if roles are aligned; if so, return idempotent success. If not, align them and return success.
      const currentAuthRole = authUser.app_metadata?.role;
      if (currentAuthRole !== role || profile.role !== role) {
        console.log(`[Atomic Add] Aligning existing user role to requested: ${role}`);
        // Align auth role
        await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
          app_metadata: { role }
        });
        // Align profile role
        await supabaseAdmin.from('users').update({ role }).eq('id', authUser.id);
      }
      return NextResponse.json({
        success: true,
        message: 'User already exists, roles verified and aligned.',
        uid: authUser.id,
        email: normalizedEmail
      });
    }

    // ==========================================
    // CASE B: Auth exists, Profile missing (Self-Heal Profile on Server)
    // ==========================================
    if (authUser && !profile) {
      console.log(`[Atomic Add] Self-Healing: Auth exists but Profile is missing for ${normalizedEmail}. Creating Profile...`);
      
      const { error: dbInsertError } = await supabaseAdmin.from('users').insert({
        id: authUser.id,
        email: normalizedEmail,
        display_name: username || normalizedEmail.split('@')[0],
        role: role,
        status: 'active',
        is_verified: true
      });

      if (dbInsertError) {
        console.error('[Atomic Add] Profile self-heal insert failed:', dbInsertError);
        return NextResponse.json({ error: `Server self-heal failed: ${dbInsertError.message}` }, { status: 500 });
      }

      // Keep Auth role synchronized with requested role
      if (authUser.app_metadata?.role !== role) {
        await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
          app_metadata: { role }
        });
      }

      return NextResponse.json({
        success: true,
        uid: authUser.id,
        email: normalizedEmail,
        message: 'Auth account existed; associated profile successfully recreated and synchronized on server.'
      });
    }

    // ==========================================
    // CASE C: Profile exists, Auth missing (Self-Heal Auth on Server)
    // ==========================================
    if (!authUser && profile) {
      console.log(`[Atomic Add] Self-Healing: Profile exists but Auth is missing for ${normalizedEmail}. Recreating Auth user...`);
      
      const { data: repairedAuth, error: repairError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true,
        user_metadata: { display_name: profile.display_name || username || normalizedEmail.split('@')[0] },
        app_metadata: { role: role } // Set the newly requested role
      });

      if (repairError || !repairedAuth?.user) {
        console.error('[Atomic Add] Auth self-heal creation failed:', repairError);
        return NextResponse.json({ error: `Server self-heal failed to create auth credentials: ${repairError?.message}` }, { status: 500 });
      }

      const newUid = repairedAuth.user.id;

      // Update existing profile's ID to match new auth ID
      const { error: dbUpdateError } = await supabaseAdmin
        .from('users')
        .update({ id: newUid, role: role })
        .eq('email', normalizedEmail);

      if (dbUpdateError) {
        console.error('[Atomic Add] Failed to map existing profile to new Auth UID. Rolling back Auth creation...', dbUpdateError);
        // Server-side rollback of Auth creation
        await supabaseAdmin.auth.admin.deleteUser(newUid);
        return NextResponse.json({ error: `Server self-heal failed to map profile: ${dbUpdateError.message}. Auth credentials rolled back.` }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        uid: newUid,
        email: normalizedEmail,
        message: 'Profile existed; auth credentials successfully generated and synchronized on server.'
      });
    }

    // ==========================================
    // CASE D: Neither exists (Full atomic creation)
    // ==========================================
    console.log(`[Atomic Add] Creating new Auth account for ${normalizedEmail}...`);
    const { data: newAuthData, error: newAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true,
      user_metadata: { display_name: username || normalizedEmail.split('@')[0] },
      app_metadata: { role }
    });

    if (newAuthError || !newAuthData?.user) {
      console.error('[Atomic Add] Failed to create new Auth user:', {
        message: newAuthError?.message,
        status: newAuthError?.status,
        name: newAuthError?.name
      });
      return NextResponse.json({ 
        error: `Failed to create auth credentials: ${newAuthError?.message || 'Unknown Auth Error'}`,
        details: newAuthError
      }, { status: newAuthError?.status || 400 });
    }

    const newUid = newAuthData.user.id;
    console.log(`[Atomic Add] Auth user created with UID: ${newUid}. Inserting canonical profile record...`);

    const { error: dbInsertError } = await supabaseAdmin.from('users').insert({
      id: newUid,
      email: normalizedEmail,
      display_name: username || normalizedEmail.split('@')[0],
      role: role,
      status: 'active',
      is_verified: true
    });

    if (dbInsertError) {
      console.error('[Atomic Add] Profile insert failed. Rolling back created Auth user...', {
        message: dbInsertError.message,
        code: dbInsertError.code,
        details: dbInsertError.details,
        hint: dbInsertError.hint
      });
      // Server-side rollback of Auth creation to maintain strict consistency
      await supabaseAdmin.auth.admin.deleteUser(newUid);
      return NextResponse.json({ 
        error: `Failed to create user profile: ${dbInsertError.message}. Auth account rolled back.`,
        details: dbInsertError,
        code: dbInsertError.code
      }, { status: 500 });
    }

    console.log(`[Atomic Add] Successfully completed atomic creation of ${normalizedEmail}.`);
    return NextResponse.json({
      success: true,
      uid: newUid,
      email: normalizedEmail,
      message: 'User created successfully with full server-side consistency and synchronization.'
    });

  } catch (error: any) {
    console.error('Unexpected server error in /api/users/add:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json({ error: 'An unexpected internal server error occurred.' }, { status: 500 });
  }
}
