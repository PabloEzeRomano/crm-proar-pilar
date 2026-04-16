/**
 * supabase/functions/deactivate-user/index.ts — Admin deactivation
 *
 * Bans a user and soft-deletes their clients.
 * Only admin or root callers can call this function.
 * Target user must not be admin or root.
 *
 * Request body (JSON):
 *   { userId: string }
 *
 * Authorization: Bearer <caller's JWT>
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserRole = 'user' | 'admin' | 'root'

interface Profile {
  id: string
  role: UserRole
  company_id: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  })
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // ── 1. Authenticate caller ──────────────────────────────────────────────

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing authorization header' }, 401)
    }
    const callerJwt = authHeader.slice(7)

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${callerJwt}` } },
    })

    const { data: { user: callerUser }, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !callerUser) {
      return jsonResponse({ error: 'Invalid or expired token' }, 401)
    }

    // ── 2. Load caller's profile ────────────────────────────────────────────

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: callerProfile, error: callerProfileErr } = await adminClient
      .from('profiles')
      .select('id, role, company_id')
      .eq('id', callerUser.id)
      .single<Profile>()

    if (callerProfileErr || !callerProfile) {
      return jsonResponse({ error: 'Caller profile not found' }, 403)
    }

    if (callerProfile.role !== 'admin' && callerProfile.role !== 'root') {
      return jsonResponse({ error: 'Forbidden: admin or root role required' }, 403)
    }

    // ── 3. Parse request body ───────────────────────────────────────────────

    let body: { userId: string }
    try {
      body = await req.json() as { userId: string }
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const { userId } = body
    if (!userId || typeof userId !== 'string') {
      return jsonResponse({ error: 'userId is required' }, 400)
    }

    // ── 4. Load target's profile ────────────────────────────────────────────

    const { data: targetProfile, error: targetProfileErr } = await adminClient
      .from('profiles')
      .select('id, role, company_id')
      .eq('id', userId)
      .single<Profile>()

    if (targetProfileErr || !targetProfile) {
      return jsonResponse({ error: 'Target user profile not found' }, 404)
    }

    // Cannot deactivate admin or root users
    if (targetProfile.role === 'admin' || targetProfile.role === 'root') {
      return jsonResponse({ error: 'Cannot deactivate admin or root users' }, 403)
    }

    // Admin can only deactivate users in their own company
    if (callerProfile.role === 'admin' && targetProfile.company_id !== callerProfile.company_id) {
      return jsonResponse({ error: 'Cannot deactivate users from a different company' }, 403)
    }

    // ── 5. Ban the user (effectively ~10 years) ─────────────────────────────

    const { error: banErr } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: '87600h',
    })

    if (banErr) {
      return jsonResponse({ error: 'Failed to ban user: ' + banErr.message }, 500)
    }

    // ── 6. Soft-delete their clients ────────────────────────────────────────

    const { error: clientsErr } = await adminClient
      .from('clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('owner_user_id', userId)
      .is('deleted_at', null)

    if (clientsErr) {
      console.error('Failed to soft-delete clients:', clientsErr.message)
      // Non-fatal — user is already banned; log and continue
    }

    // ── 7. Soft-delete their visits (if column exists) ──────────────────────
    // visits table does not have deleted_at — skipping visit soft-delete.
    console.log('Note: visits table has no deleted_at column — skipping visit soft-delete for user', userId)

    return jsonResponse({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('deactivate-user error:', message)
    return jsonResponse({ error: message }, 500)
  }
})
