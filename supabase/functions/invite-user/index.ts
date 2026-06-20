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
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserRole = 'user' | 'admin' | 'root';

interface Profile {
  id: string;
  role: UserRole;
  company_id: string | null;
}

interface InviteBody {
  email: string;
  role: 'user' | 'admin';
  /** App origin to redirect the invite link to (e.g. http://localhost:8081). */
  redirectTo?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
  };
}

interface AuthUser {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
}

/** Look up an auth user by email (case-insensitive). Null if none. */
async function findUserByEmail(
  // deno-lint-ignore no-explicit-any
  adminClient: any,
  email: string
): Promise<AuthUser | null> {
  const target = email.toLowerCase();
  const { data } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  return (
    (data?.users as AuthUser[] | undefined)?.find(
      (u) => u.email?.toLowerCase() === target
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // ── 1. Authenticate caller ──────────────────────────────────────────────

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing authorization header' }, 401);
    }
    const callerJwt = authHeader.slice(7);

    // Use anon key client + caller JWT to identify the caller
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

    // ── 2. Load caller's profile ────────────────────────────────────────────

    // Use service-role client to bypass RLS for profile lookup
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('id, role, company_id')
      .eq('id', callerUser.id)
      .single<Profile>();

    if (profileErr || !callerProfile) {
      return jsonResponse({ error: 'Caller profile not found' }, 403);
    }

    // ── 3. Guard: caller must be admin or root ──────────────────────────────

    if (callerProfile.role !== 'admin' && callerProfile.role !== 'root') {
      return jsonResponse(
        { error: 'Forbidden: admin or root role required' },
        403
      );
    }

    // ── 3b. Guard: caller must belong to a company ────────────────────────

    if (!callerProfile.company_id) {
      return jsonResponse({ error: 'Caller has no company assigned' }, 403);
    }

    // ── 4. Parse and validate request body ─────────────────────────────────

    let body: InviteBody;
    try {
      body = (await req.json()) as InviteBody;
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const { email, role, redirectTo } = body;

    // Only honor http(s) redirect targets; otherwise fall back to Site URL.
    const safeRedirectTo =
      typeof redirectTo === 'string' && /^https?:\/\//.test(redirectTo)
        ? redirectTo
        : undefined;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return jsonResponse({ error: 'Invalid email address' }, 400);
    }

    if (role !== 'user' && role !== 'admin') {
      return jsonResponse(
        { error: 'Invalid role: must be "user" or "admin"' },
        400
      );
    }

    // ── 5. Seat limit check (skip for root) ────────────────────────────────

    if (callerProfile.role !== 'root') {
      // Read max_users from company_config
      const { data: config, error: configErr } = await adminClient
        .from('company_config')
        .select('max_users')
        .eq('company_id', callerProfile.company_id)
        .single<{ max_users: number }>();

      if (configErr || !config) {
        return jsonResponse({ error: 'Company configuration not found' }, 500);
      }

      // Count current active users in the company
      const { count, error: countErr } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', callerProfile.company_id);

      if (countErr) {
        return jsonResponse({ error: 'Failed to count company users' }, 500);
      }

      const currentCount = count ?? 0;
      if (currentCount >= config.max_users) {
        return jsonResponse(
          {
            error: 'Seat limit reached',
            detail: `Company has ${currentCount}/${config.max_users} users. Increase max_users in company_config to invite more.`,
          },
          403
        );
      }
    }

    // ── 6. Send invite ──────────────────────────────────────────────────────

    // needs_password lets the app force the password-setup screen on first
    // sign-in regardless of the auth flow (token / PKCE code / callback).
    const inviteMeta = {
      role,
      company_id: callerProfile.company_id,
      needs_password: true,
    };

    let { data: inviteData, error: inviteErr } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: inviteMeta,
        redirectTo: safeRedirectTo,
      });

    if (inviteErr) {
      const lower = inviteErr.message.toLowerCase();
      const alreadyExists =
        lower.includes('already') ||
        lower.includes('registered') ||
        lower.includes('exists');

      if (alreadyExists) {
        // The email exists. If it's a pending invite that was never accepted
        // (unconfirmed + never signed in), it's safe to delete and re-invite,
        // which resends the email. An active (confirmed) user is rejected.
        const existing = await findUserByEmail(adminClient, email);
        const isPending =
          !!existing && !existing.email_confirmed_at && !existing.last_sign_in_at;

        if (existing && isPending) {
          await adminClient.auth.admin.deleteUser(existing.id);
          ({ data: inviteData, error: inviteErr } =
            await adminClient.auth.admin.inviteUserByEmail(email, {
              data: inviteMeta,
              redirectTo: safeRedirectTo,
            }));
          if (inviteErr) {
            return jsonResponse({ error: inviteErr.message }, 422);
          }
        } else {
          return jsonResponse(
            { error: 'A user with this email already exists' },
            422
          );
        }
      } else {
        return jsonResponse({ error: inviteErr.message }, 422);
      }
    }

    return jsonResponse({
      ok: true,
      invited_user_id: inviteData.user?.id,
      email,
      role,
      company_id: callerProfile.company_id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('invite-user error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
