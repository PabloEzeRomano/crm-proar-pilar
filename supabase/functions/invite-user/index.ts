/**
 * supabase/functions/invite-user/index.ts — Admin-controlled user invitation
 *
 * Called by admin/root users to invite a new user to their company.
 * Uses the Supabase Auth Admin API (service-role key) to provision the user
 * and obtain an invite action link, then sends a CUSTOM-styled invite email
 * via Resend (NOT Supabase's built-in email).
 *
 * Request body (JSON):
 *   { email: string, role: 'user' | 'admin', redirectTo?: string }
 *
 * Authorization: Bearer <caller's JWT>
 *
 * Seat limit logic:
 *   - Reads max_users from company_config for the caller's company
 *   - Counts active profiles with the same company_id
 *   - Rejects with 403 if count >= max_users AND caller is NOT root
 *   - Root always bypasses the seat limit
 *
 * Invite delivery:
 *   - adminClient.auth.admin.generateLink({ type: 'invite', ... }) provisions
 *     the user and returns the action link WITHOUT sending an email.
 *   - The action link is embedded in a custom Resend email (CTA button).
 *   - When the user accepts, the handle_new_user trigger creates their profile
 *     with the role and company_id passed in raw_user_meta_data.
 *
 * Required secrets (auto-injected by Supabase):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY
 *
 * Required Edge Function secrets (set in Supabase dashboard):
 *   RESEND_API_KEY      — your Resend API key
 *   MAIL_FROM_ADDRESS   — verified sender address (e.g. noreply@send.gemm-apps.com)
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

interface AuthUser {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
}

interface InviteMeta {
  role: 'user' | 'admin';
  company_id: string;
  needs_password: boolean;
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

/**
 * Escape HTML special characters to prevent injection in the email body.
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Provision the user (if needed) and obtain the invite action link WITHOUT
 * sending Supabase's built-in email. Returns the action link to embed in the
 * custom Resend email.
 */
async function generateInviteLink(
  // deno-lint-ignore no-explicit-any
  adminClient: any,
  email: string,
  inviteMeta: InviteMeta,
  redirectTo?: string
): Promise<{ actionLink: string | null; userId?: string; error?: string }> {
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: inviteMeta,
      redirectTo,
    },
  });

  if (error) {
    return { actionLink: null, error: error.message };
  }

  const actionLink: string | undefined = data?.properties?.action_link;
  const userId: string | undefined = data?.user?.id;
  if (!actionLink) {
    return {
      actionLink: null,
      error: 'No action link returned by generateLink',
    };
  }
  return { actionLink, userId };
}

// ---------------------------------------------------------------------------
// Custom invite email (Resend)
// ---------------------------------------------------------------------------

interface EmailBranding {
  appName: string;
  accent: string;
}

const BRANDING: Record<string, EmailBranding> = {
  'campaign-management': { appName: 'Sensei CRM', accent: '#0F766E' },
  'pipeline':            { appName: 'gemm-apps CRM', accent: '#059669' },
};

function buildInviteHtml(actionLink: string, branding: EmailBranding): string {
  const { appName, accent } = branding;
  const safeLink = escapeHtml(actionLink);
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Invitación a ${appName}</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:${accent};padding:24px 32px;border-radius:12px 12px 0 0;">
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);letter-spacing:0.5px;text-transform:uppercase;">${appName}</p>
              <h1 style="margin:4px 0 0;font-size:22px;font-weight:700;color:#FFFFFF;">Te invitaron a ${appName}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#FFFFFF;padding:28px 32px 8px;">
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.5;">
                Hola, recibiste una invitación para unirte a ${appName}.
                Para activar tu cuenta y definir tu contraseña, hacé clic en el botón:
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="background:#FFFFFF;padding:8px 32px 28px;" align="center">
              <a href="${safeLink}" target="_blank" style="
                display:inline-block;
                background:${accent};
                color:#FFFFFF;
                font-size:16px;
                font-weight:600;
                text-decoration:none;
                padding:14px 32px;
                border-radius:8px;
              ">Aceptar invitación</a>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="background:#FFFFFF;padding:0 32px 24px;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.5;">
                Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br>
                <a href="${safeLink}" target="_blank" style="color:${accent};word-break:break-all;">${safeLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#FFFFFF;padding:20px 32px;border-top:1px solid #E5E7EB;border-radius:0 0 12px 12px;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
                Si no esperabas esta invitación, podés ignorar este correo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildInviteText(actionLink: string, branding: EmailBranding): string {
  return [
    `Te invitaron a ${branding.appName}.`,
    '',
    'Para activar tu cuenta y definir tu contraseña, abrí este enlace:',
    actionLink,
    '',
    'Si no esperabas esta invitación, podés ignorar este correo.',
  ].join('\n');
}

/**
 * Send the custom invite email via Resend. Throws if the Resend API returns an
 * error. Caller is responsible for verifying RESEND_API_KEY / MAIL_FROM_ADDRESS
 * are present before invoking.
 */
async function sendInviteEmail(
  email: string,
  actionLink: string,
  apiKey: string,
  fromAddress: string,
  branding: EmailBranding
): Promise<void> {
  const body = {
    from: `${branding.appName} <${fromAddress}>`,
    to: [email],
    subject: `Te invitaron a ${branding.appName}`,
    html: buildInviteHtml(actionLink, branding),
    text: buildInviteText(actionLink, branding),
  };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Resend error ${res.status}: ${errBody}`);
  }
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

    // Resend secrets — required for Sensei and gemm (custom email) paths.
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const mailFromAddress = Deno.env.get('MAIL_FROM_ADDRESS');

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

    // Apps with custom Resend email: Sensei (campaign-management) and gemm (pipeline).
    // Other apps (Proar / field-sales) keep Supabase's built-in invite email.
    const { data: companyCfg } = await adminClient
      .from('company_config')
      .select('crm_type')
      .eq('company_id', callerProfile.company_id)
      .single<{ crm_type: string }>();
    const crmType = companyCfg?.crm_type ?? '';
    const branding = BRANDING[crmType];
    const isCustomEmail = !!branding;

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

    // Admin can only invite users (not other admins); only root can invite admins.
    if (callerProfile.role === 'admin' && role === 'admin') {
      return jsonResponse(
        { error: 'Forbidden: only root can invite admins' },
        403
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

    // ── 6. Send the invite ─────────────────────────────────────────────────

    // needs_password lets the app force the password-setup screen on first
    // sign-in regardless of the auth flow (token / PKCE code / callback).
    const inviteMeta: InviteMeta = {
      role,
      company_id: callerProfile.company_id,
      needs_password: true,
    };

    // ── 6a. Sensei / gemm: custom-styled email via Resend (no built-in email) ─
    if (isCustomEmail) {
      if (!resendApiKey || !mailFromAddress) {
        return jsonResponse(
          {
            error:
              'Email is not configured: set RESEND_API_KEY and MAIL_FROM_ADDRESS secrets',
          },
          500
        );
      }

      let { actionLink, userId, error: linkErr } = await generateInviteLink(
        adminClient,
        email,
        inviteMeta,
        safeRedirectTo
      );

      if (linkErr) {
        const lower = linkErr.toLowerCase();
        const alreadyExists =
          lower.includes('already') ||
          lower.includes('registered') ||
          lower.includes('exists');

        if (alreadyExists) {
          const existing = await findUserByEmail(adminClient, email);
          const isPending =
            !!existing &&
            !existing.email_confirmed_at &&
            !existing.last_sign_in_at;

          if (existing && isPending) {
            await adminClient.auth.admin.deleteUser(existing.id);
            ({ actionLink, userId, error: linkErr } = await generateInviteLink(
              adminClient,
              email,
              inviteMeta,
              safeRedirectTo
            ));
            if (linkErr) return jsonResponse({ error: linkErr }, 422);
          } else {
            return jsonResponse(
              { error: 'A user with this email already exists' },
              422
            );
          }
        } else {
          return jsonResponse({ error: linkErr }, 422);
        }
      }

      if (!actionLink) {
        return jsonResponse({ error: 'Failed to generate invite link' }, 422);
      }

      try {
        await sendInviteEmail(email, actionLink, resendApiKey, mailFromAddress, branding);
      } catch (sendErr: unknown) {
        const sendMsg =
          sendErr instanceof Error ? sendErr.message : String(sendErr);
        console.error('invite-user email send error:', sendMsg);
        return jsonResponse(
          { error: `Failed to send invite email: ${sendMsg}` },
          502
        );
      }

      return jsonResponse({
        ok: true,
        invited_user_id: userId,
        email,
        role,
        company_id: callerProfile.company_id,
      });
    }

    // ── 6b. Other apps (Proar / field-sales): Supabase built-in invite email ──
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
        const existing = await findUserByEmail(adminClient, email);
        const isPending =
          !!existing &&
          !existing.email_confirmed_at &&
          !existing.last_sign_in_at;

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
          return jsonResponse({ error: inviteErr.message }, 422);
        }
      } else {
        return jsonResponse({ error: inviteErr.message }, 422);
      }
    }

    return jsonResponse({
      ok: true,
      invited_user_id: inviteData?.user?.id,
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
