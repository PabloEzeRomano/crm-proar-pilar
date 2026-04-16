/**
 * supabase/functions/list-users/index.ts — Admin user list
 *
 * Returns all users in the caller's company (root sees all non-root users).
 * Uses the Auth Admin API (service-role key) to get invite/ban metadata,
 * then joins with profiles to determine status.
 *
 * Authorization: Bearer <caller's JWT> — must be admin or root
 *
 * Response: UserListItem[]
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserRole = 'user' | 'admin' | 'root'

interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  company_id: string | null
}

interface CallerProfile extends Profile {
  role: UserRole
}

export interface UserListItem {
  id: string
  email: string
  full_name: string | null
  role: UserRole | null
  status: 'active' | 'pending' | 'banned'
  invited_at: string | null
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

    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('id, role, company_id')
      .eq('id', callerUser.id)
      .single<CallerProfile>()

    if (profileErr || !callerProfile) {
      return jsonResponse({ error: 'Caller profile not found' }, 403)
    }

    if (callerProfile.role !== 'admin' && callerProfile.role !== 'root') {
      return jsonResponse({ error: 'Forbidden: admin or root role required' }, 403)
    }

    // ── 3. List all auth users via Admin API ────────────────────────────────

    const { data: authData, error: listErr } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    })

    if (listErr) {
      return jsonResponse({ error: 'Failed to list users' }, 500)
    }

    const authUsers = authData?.users ?? []

    // ── 4. Load all profiles in the same company ────────────────────────────

    let profileQuery = adminClient
      .from('profiles')
      .select('id, full_name, role, company_id')

    if (callerProfile.role !== 'root' && callerProfile.company_id) {
      profileQuery = profileQuery.eq('company_id', callerProfile.company_id)
    }

    const { data: profiles } = await profileQuery
    const profileMap = new Map<string, Profile>()
    for (const p of (profiles ?? [])) {
      profileMap.set(p.id, p)
    }

    // ── 5. Build UserListItem list ──────────────────────────────────────────

    const items: UserListItem[] = []

    for (const authUser of authUsers) {
      const profile = profileMap.get(authUser.id)

      // Filter by company: if caller is admin (not root), only include users
      // whose profile is in the same company OR who have no profile yet but
      // were invited by someone in this company (check raw_user_meta_data).
      if (callerProfile.role !== 'root') {
        const companyId = callerProfile.company_id
        const profileCompanyId = profile?.company_id
        const metaCompanyId = (authUser.raw_user_meta_data as Record<string, unknown> | null)?.company_id as string | undefined

        if (profileCompanyId !== companyId && metaCompanyId !== companyId) {
          continue
        }
      }

      // Exclude root users from the list — covers confirmed root, pending root,
      // and any edge case where profile and metadata disagree
      const metaRole = (authUser.raw_user_meta_data as Record<string, unknown> | null)
        ?.role as string | undefined
      if (profile?.role === 'root' || metaRole === 'root') continue

      // Determine status
      let status: 'active' | 'pending' | 'banned'
      if (authUser.banned_until && new Date(authUser.banned_until) > new Date()) {
        status = 'banned'
      } else if (!authUser.confirmed_at) {
        status = 'pending'
      } else {
        status = 'active'
      }

      items.push({
        id: authUser.id,
        email: authUser.email ?? '',
        full_name: profile?.full_name ?? null,
        role: profile?.role ?? null,
        status,
        invited_at: authUser.invited_at ?? null,
        company_id: profile?.company_id ?? (authUser.raw_user_meta_data as Record<string, unknown> | null)?.company_id as string | null ?? null,
      })
    }

    return jsonResponse(items)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('list-users error:', message)
    return jsonResponse({ error: message }, 500)
  }
})
