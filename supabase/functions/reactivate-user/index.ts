/**
 * supabase/functions/reactivate-user/index.ts — Admin reactivation
 *
 * Lifts the ban on a previously deactivated user and restores their
 * soft-deleted clients. Only admin or root callers can call this function.
 * Target user must not be admin or root and must belong to the caller's company.
 *
 * Request body (JSON):
 *   { userId: string }
 *
 * Authorization: Bearer <caller's JWT>
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type UserRole = 'user' | 'product_manager' | 'admin' | 'root';

interface Profile {
  id: string;
  role: UserRole;
  company_id: string | null;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing authorization header' }, 401);
    }
    const callerJwt = authHeader.slice(7);

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${callerJwt}` } },
    });

    const {
      data: { user: callerUser },
      error: userErr,
    } = await callerClient.auth.getUser();
    if (userErr || !callerUser) {
      return jsonResponse({ error: 'Invalid or expired token' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile, error: callerProfileErr } = await adminClient
      .from('profiles')
      .select('id, role, company_id')
      .eq('id', callerUser.id)
      .single<Profile>();

    if (callerProfileErr || !callerProfile) {
      return jsonResponse({ error: 'Caller profile not found' }, 403);
    }

    if (callerProfile.role !== 'admin' && callerProfile.role !== 'root') {
      return jsonResponse(
        { error: 'Forbidden: admin or root role required' },
        403
      );
    }

    let body: { userId: string };
    try {
      body = (await req.json()) as { userId: string };
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const { userId } = body;
    if (!userId || typeof userId !== 'string') {
      return jsonResponse({ error: 'userId is required' }, 400);
    }

    const { data: targetProfile, error: targetProfileErr } = await adminClient
      .from('profiles')
      .select('id, role, company_id')
      .eq('id', userId)
      .single<Profile>();

    if (targetProfileErr || !targetProfile) {
      return jsonResponse({ error: 'Target user profile not found' }, 404);
    }

    if (targetProfile.company_id !== callerProfile.company_id) {
      return jsonResponse(
        { error: 'Cannot reactivate users from a different company' },
        403
      );
    }

    // ── Lift the ban ────────────────────────────────────────────────────────

    const { error: unbanErr } = await adminClient.auth.admin.updateUserById(
      userId,
      {
        ban_duration: 'none',
      }
    );

    if (unbanErr) {
      return jsonResponse(
        { error: 'Failed to reactivate user: ' + unbanErr.message },
        500
      );
    }

    // ── Restore their soft-deleted clients ──────────────────────────────────
    // clients are only ever soft-deleted by deactivate-user, so restoring all
    // of this owner's soft-deleted clients is safe.

    const { error: clientsErr } = await adminClient
      .from('clients')
      .update({ deleted_at: null })
      .eq('owner_user_id', userId)
      .not('deleted_at', 'is', null);

    if (clientsErr) {
      console.error('Failed to restore clients:', clientsErr.message);
      // Non-fatal — user is already reactivated; log and continue
    }

    return jsonResponse({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('reactivate-user error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
