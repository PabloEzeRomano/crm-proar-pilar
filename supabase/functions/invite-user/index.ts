/**
 * supabase/functions/invite-user/index.ts — Admin-controlled user invitation
 *
 * Called by admin/root users to invite a new user to their company.
 * Uses the Supabase Auth Admin API (service-role key) so the invite email
 * is sent by Supabase and the new user can set their password via magic link.
 *
 * Request body (JSON):
 *   { email: string, role: 'user' | 'admin' }
 *
 * Authorization: Bearer <caller's JWT>
 *
 * Seat limit logic:
 *   - Reads max_users from company_config for the caller's company
 *   - Counts active profiles with the same company_id
 *   - Rejects with 403 if count >= max_users AND caller is NOT root
 *   - Root always bypasses the seat limit
 *
 * On success the invited user receives a Supabase invite email.
 * When they accept, handle_new_user trigger creates their profile with
 * the role and company_id passed in raw_user_meta_data.
 *
 * Required secrets (auto-injected by Supabase):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY
 *
 * Optional secret (set in Supabase Edge Function secrets):
 *   INVITE_REDIRECT_URL — URL of the password-setup page the invite email links to.
 *     Native: file:///path/to/invite.html (side-loaded)
 *     Web:    https://your-domain.com/auth/invite.html
 *     Local:  http://localhost:8081/web/auth/invite.html (for dev)
 *   Falls back to Supabase's default invite confirmation page if not set.
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

interface InviteBody {
  email: string
  role: 'user' | 'admin'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const inviteRedirectUrl = Deno.env.get('INVITE_REDIRECT_URL') ?? undefined

    // ── 1. Authenticate caller ──────────────────────────────────────────────

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing authorization header' }, 401)
    }
    const callerJwt = authHeader.slice(7)

    // Use anon key client + caller JWT to identify the caller
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${callerJwt}` } },
    })

    const { data: { user: callerUser }, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !callerUser) {
      return jsonResponse({ error: 'Invalid or expired token' }, 401)
    }

    // ── 2. Load caller's profile ────────────────────────────────────────────

    // Use service-role client to bypass RLS for profile lookup
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('id, role, company_id')
      .eq('id', callerUser.id)
      .single<Profile>()

    if (profileErr || !callerProfile) {
      return jsonResponse({ error: 'Caller profile not found' }, 403)
    }

    // ── 3. Guard: caller must be admin or root ──────────────────────────────

    if (callerProfile.role !== 'admin' && callerProfile.role !== 'root') {
      return jsonResponse({ error: 'Forbidden: admin or root role required' }, 403)
    }

    // ── 4. Parse and validate request body ─────────────────────────────────

    let body: InviteBody
    try {
      body = await req.json() as InviteBody
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const { email, role } = body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return jsonResponse({ error: 'Invalid email address' }, 400)
    }

    if (role !== 'user' && role !== 'admin') {
      return jsonResponse({ error: 'Invalid role: must be "user" or "admin"' }, 400)
    }

    // ── 5. Seat limit check (skip for root) ────────────────────────────────

    if (callerProfile.role !== 'root') {
      if (!callerProfile.company_id) {
        return jsonResponse({ error: 'Caller has no company assigned' }, 403)
      }

      // Read max_users from company_config
      const { data: config, error: configErr } = await adminClient
        .from('company_config')
        .select('max_users')
        .eq('company_id', callerProfile.company_id)
        .single<{ max_users: number }>()

      if (configErr || !config) {
        return jsonResponse({ error: 'Company configuration not found' }, 500)
      }

      // Count current active users in the company
      const { count, error: countErr } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', callerProfile.company_id)

      if (countErr) {
        return jsonResponse({ error: 'Failed to count company users' }, 500)
      }

      const currentCount = count ?? 0
      if (currentCount >= config.max_users) {
        return jsonResponse(
          {
            error: 'Seat limit reached',
            detail: `Company has ${currentCount}/${config.max_users} users. Increase max_users in company_config to invite more.`,
          },
          403,
        )
      }
    }

    // ── 6. Send invite ──────────────────────────────────────────────────────

    const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          role,
          company_id: callerProfile.company_id,
        },
        ...(inviteRedirectUrl ? { redirectTo: inviteRedirectUrl } : {}),
      },
    )

    if (inviteErr) {
      // Surface a friendly message for already-registered emails
      const msg = inviteErr.message.toLowerCase().includes('already')
        ? 'A user with this email already exists'
        : inviteErr.message
      return jsonResponse({ error: msg }, 422)
    }

    return jsonResponse({
      ok: true,
      invited_user_id: inviteData.user?.id,
      email,
      role,
      company_id: callerProfile.company_id,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('invite-user error:', message)
    return jsonResponse({ error: message }, 500)
  }
})
