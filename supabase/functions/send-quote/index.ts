/**
 * supabase/functions/send-quote/index.ts — Send quote email via Resend
 *
 * Request body (JSON):
 *   { visitId: string, recipientEmail: string, recipientName?: string }
 *
 * Authorization: Bearer <caller's JWT>
 *
 * Required secrets (set in Supabase dashboard):
 *   RESEND_API_KEY
 *   MAIL_FROM_NAME
 *   MAIL_FROM_ADDRESS
 *
 * Standard Supabase secrets (auto-injected):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserRole = 'user' | 'admin' | 'root'

interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  email_config: { sender?: string; sender_name?: string } | null
}

interface ContactInfo {
  name?: string
  phone?: string
  email?: string
}

interface Client {
  id: string
  name: string
  address: string | null
  city: string | null
  contacts: ContactInfo[]
}

interface QuoteItem {
  product_id: string
  product_name: string
  product_code: string | null
  presentation_id: string
  presentation_label: string
  unit: string
  quantity: number
  unit_price_usd: number
  margin_pct: number
  total_usd: number
}

interface Visit {
  id: string
  owner_user_id: string
  type: string
  scheduled_at: string
  items: QuoteItem[] | null
  amount: number | null
  client: Client
}

interface RequestBody {
  visitId: string
  recipientEmail: string
  recipientName?: string
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
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

function formatAmount(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ---------------------------------------------------------------------------
// HTML generator
// ---------------------------------------------------------------------------

function generateQuoteHtml(opts: {
  clientName: string
  recipientName: string | null
  senderName: string | null
  dateLabel: string
  items: QuoteItem[]
  total: number
}): string {
  const { clientName, recipientName, senderName, dateLabel, items, total } = opts

  const greeting = recipientName ? `Estimado/a ${escapeHtml(recipientName)}` : 'Estimado/a cliente'

  const itemRows = items.map((item) => `
    <tr style="border-bottom:1px solid #E5E7EB;">
      <td style="padding:10px 12px;font-size:14px;color:#111827;">
        ${item.product_code ? `<span style="color:#6B7280;font-size:12px;">[${escapeHtml(item.product_code)}]</span> ` : ''}${escapeHtml(item.product_name)}
        <div style="font-size:12px;color:#6B7280;margin-top:2px;">${escapeHtml(item.presentation_label)}</div>
      </td>
      <td style="padding:10px 12px;text-align:center;font-size:14px;color:#374151;">${escapeHtml(item.unit)}</td>
      <td style="padding:10px 12px;text-align:center;font-size:14px;color:#374151;">${item.quantity}</td>
      <td style="padding:10px 12px;text-align:right;font-size:14px;color:#374151;">$${formatAmount(item.unit_price_usd)}</td>
      <td style="padding:10px 12px;text-align:right;font-size:14px;font-weight:600;color:#1D4ED8;">$${formatAmount(item.total_usd)}</td>
    </tr>`).join('')

  const footerSender = senderName ? `<p style="margin:4px 0 0;font-size:13px;color:#374151;">${escapeHtml(senderName)}</p>` : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Cotización — ${escapeHtml(clientName)}</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#1D4ED8;padding:24px 32px;border-radius:12px 12px 0 0;">
              <p style="margin:0;font-size:13px;color:#BFDBFE;letter-spacing:0.5px;text-transform:uppercase;">Cotización</p>
              <h1 style="margin:4px 0 0;font-size:22px;font-weight:700;color:#FFFFFF;">${escapeHtml(clientName)}</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#BFDBFE;">${escapeHtml(dateLabel)}</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="background:#FFFFFF;padding:24px 32px 8px;">
              <p style="margin:0;font-size:15px;color:#374151;">${greeting},</p>
              <p style="margin:8px 0 0;font-size:15px;color:#374151;">A continuación le detallamos nuestra cotización:</p>
            </td>
          </tr>

          <!-- Items table -->
          <tr>
            <td style="background:#FFFFFF;padding:8px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:16px;">
                <thead>
                  <tr style="background:#F3F4F6;">
                    <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6B7280;font-weight:600;">PRODUCTO</th>
                    <th style="padding:8px 12px;text-align:center;font-size:12px;color:#6B7280;font-weight:600;">PRESENTACIÓN</th>
                    <th style="padding:8px 12px;text-align:center;font-size:12px;color:#6B7280;font-weight:600;">CANT.</th>
                    <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6B7280;font-weight:600;">PRECIO UNIT.</th>
                    <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6B7280;font-weight:600;">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
                <tfoot>
                  <tr style="border-top:2px solid #E5E7EB;">
                    <td colspan="4" style="padding:12px;font-weight:700;text-align:right;font-size:15px;color:#111827;">TOTAL</td>
                    <td style="padding:12px;font-weight:700;text-align:right;font-size:15px;color:#1D4ED8;">$${formatAmount(total)} USD</td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#FFFFFF;padding:24px 32px;border-top:1px solid #E5E7EB;border-radius:0 0 12px 12px;margin-top:8px;">
              <p style="margin:0;font-size:14px;color:#374151;">Quedo a disposición para cualquier consulta.</p>
              <p style="margin:8px 0 0;font-size:14px;color:#374151;">Saludos cordiales,</p>
              ${footerSender}
              <p style="margin:16px 0 0;font-size:11px;color:#9CA3AF;">Este email fue generado desde CRM Proar.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Resend sender
// ---------------------------------------------------------------------------

async function sendEmail(opts: {
  from: string
  replyTo?: string
  to: string[]
  subject: string
  html: string
}): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) throw new Error('RESEND_API_KEY secret not set')

  const payload: Record<string, unknown> = {
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  }
  if (opts.replyTo) payload['reply_to'] = opts.replyTo

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend error ${res.status}: ${text}`)
  }
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
      .select('id, role, full_name, email_config')
      .eq('id', callerUser.id)
      .single<Profile>()

    if (profileErr || !callerProfile) {
      return jsonResponse({ error: 'Caller profile not found' }, 403)
    }

    // ── 3. Parse request body ───────────────────────────────────────────────

    let body: RequestBody
    try {
      body = await req.json() as RequestBody
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const { visitId, recipientEmail, recipientName } = body

    if (!visitId || typeof visitId !== 'string') {
      return jsonResponse({ error: 'visitId is required' }, 400)
    }
    if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
      return jsonResponse({ error: 'Valid recipientEmail is required' }, 400)
    }

    // ── 4. Fetch visit with client ──────────────────────────────────────────

    const { data: visit, error: visitErr } = await adminClient
      .from('visits')
      .select('*, client:clients(*)')
      .eq('id', visitId)
      .single<Visit>()

    if (visitErr || !visit) {
      return jsonResponse({ error: 'Visit not found' }, 404)
    }

    // ── 5. Validate: must be a quote, caller must own it or be admin/root ───

    if (visit.type !== 'quote') {
      return jsonResponse({ error: 'Visit is not a quote' }, 400)
    }

    const isOwner = visit.owner_user_id === callerUser.id
    const isAdmin = callerProfile.role === 'admin' || callerProfile.role === 'root'

    if (!isOwner && !isAdmin) {
      return jsonResponse({ error: 'Forbidden: you do not own this visit' }, 403)
    }

    // ── 6. Build and send email ─────────────────────────────────────────────

    const items = visit.items ?? []
    const total = visit.amount ?? items.reduce((s, i) => s + i.total_usd, 0)

    const clientName = visit.client.name
    const dateLabel = formatDate(visit.scheduled_at)

    const senderName = callerProfile.full_name ?? callerProfile.email_config?.sender_name ?? null
    const replyTo = callerProfile.email_config?.sender

    const mailFromName = Deno.env.get('MAIL_FROM_NAME') ?? 'CRM'
    const mailFromAddress = Deno.env.get('MAIL_FROM_ADDRESS') ?? 'noreply@send.gemm-apps.com'

    const html = generateQuoteHtml({
      clientName,
      recipientName: recipientName ?? null,
      senderName,
      dateLabel,
      items,
      total,
    })

    await sendEmail({
      from: `${mailFromName} <${mailFromAddress}>`,
      replyTo,
      to: [recipientEmail],
      subject: `Cotización para ${clientName} — ${dateLabel}`,
      html,
    })

    return jsonResponse({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('send-quote error:', message)
    return jsonResponse({ ok: false, error: message }, 500)
  }
})
