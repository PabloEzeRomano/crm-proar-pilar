/**
 * supabase/functions/weekly-email/index.ts — Weekly visit summary email
 *
 * Triggered every Monday at 08:00 UTC by pg_cron (see migration 0006).
 *
 * For each user with email_config.enabled = true:
 *  1. Query visits from the previous Monday 00:00 → Sunday 23:59 (UTC)
 *  2. Skip if no visits that week
 *  3. Generate an HTML email with visits grouped by date
 *  4. Send via Resend API
 *
 * Required Edge Function secrets (set in Supabase dashboard):
 *   RESEND_API_KEY      — your Resend API key
 *   MAIL_FROM_ADDRESS   — verified sender address (e.g. crm@mail.gemm-apps.com)
 *   MAIL_FROM_NAME      — display name (e.g. Proar CRM)
 *
 * The user's `email_config.sender` (if set) is used as Reply-To so replies
 * go to their personal/business inbox, not the technical sending domain.
 *
 * Standard Supabase secrets are injected automatically:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailConfig {
  sender: string | null
  recipients: string[]
  enabled: boolean
}

interface Profile {
  id: string
  full_name: string | null
  email_config: EmailConfig | null
}

interface Client {
  id: string
  name: string
  address: string | null
  city: string | null
}

interface Visit {
  id: string
  scheduled_at: string
  status: string
  notes: string | null
  client: Client
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Returns the ISO strings for last week's Monday 00:00 UTC and Sunday 23:59:59 UTC.
 * "Last week" relative to the date this function runs (Monday morning).
 */
function getLastWeekRange(): { from: string; to: string; label: string } {
  const now = new Date()

  // Go back 7 days to land in last week, then find that week's Monday
  const lastWeekDate = new Date(now)
  lastWeekDate.setUTCDate(now.getUTCDate() - 7)

  const dayOfWeek = lastWeekDate.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const monday = new Date(lastWeekDate)
  monday.setUTCDate(lastWeekDate.getUTCDate() - daysFromMonday)
  monday.setUTCHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  sunday.setUTCHours(23, 59, 59, 999)

  const fmt = (d: Date): string =>
    d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    })

  return {
    from: monday.toISOString(),
    to: sunday.toISOString(),
    label: `${fmt(monday)} al ${fmt(sunday)}`,
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

// ---------------------------------------------------------------------------
// HTML generator
// ---------------------------------------------------------------------------

function generateHtml(
  profile: Profile,
  visits: Visit[],
  weekLabel: string,
): string {
  // Group visits by date (YYYY-MM-DD)
  const byDate = new Map<string, Visit[]>()
  for (const visit of visits) {
    const dateKey = visit.scheduled_at.slice(0, 10)
    const group = byDate.get(dateKey) ?? []
    group.push(visit)
    byDate.set(dateKey, group)
  }

  const statusLabel: Record<string, string> = {
    completed: 'Completada',
    pending: 'Pendiente',
    canceled: 'Cancelada',
  }

  const statusColor: Record<string, string> = {
    completed: '#16A34A',
    pending: '#D97706',
    canceled: '#9CA3AF',
  }

  const greeting = profile.full_name ? `Hola ${profile.full_name}` : 'Hola'

  let rows = ''
  for (const [dateKey, dayVisits] of [...byDate.entries()].sort()) {
    rows += `
      <tr>
        <td colspan="4" style="
          padding: 12px 16px 6px;
          background: #F3F4F6;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          text-transform: capitalize;
          border-top: 1px solid #E5E7EB;
        ">${formatDate(dateKey + 'T00:00:00Z')}</td>
      </tr>`

    for (const visit of dayVisits) {
      const status = visit.status ?? 'pending'
      const notesHtml = visit.notes
        ? `<div style="margin-top:4px;font-size:13px;color:#6B7280;">${visit.notes.replace(/\n/g, '<br>')}</div>`
        : ''

      rows += `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #F3F4F6;vertical-align:top;width:60px;">
            <span style="font-size:14px;color:#111827;font-weight:500;">${formatTime(visit.scheduled_at)}</span>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #F3F4F6;vertical-align:top;">
            <div style="font-size:14px;font-weight:600;color:#111827;">${visit.client.name}</div>
            ${visit.client.address ? `<div style="font-size:12px;color:#9CA3AF;">${visit.client.address}${visit.client.city ? `, ${visit.client.city}` : ''}</div>` : ''}
            ${notesHtml}
          </td>
          <td style="padding:10px 16px;border-bottom:1px solid #F3F4F6;vertical-align:top;white-space:nowrap;">
            <span style="
              font-size:12px;
              font-weight:600;
              color:${statusColor[status] ?? '#9CA3AF'};
              background:${status === 'completed' ? '#DCFCE7' : status === 'pending' ? '#FEF3C7' : '#F3F4F6'};
              padding:2px 8px;
              border-radius:9999px;
            ">${statusLabel[status] ?? status}</span>
          </td>
        </tr>`
    }
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Resumen semanal</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#1D4ED8;padding:24px 32px;border-radius:12px 12px 0 0;">
              <p style="margin:0;font-size:13px;color:#BFDBFE;letter-spacing:0.5px;text-transform:uppercase;">Resumen semanal</p>
              <h1 style="margin:4px 0 0;font-size:22px;font-weight:700;color:#FFFFFF;">${weekLabel}</h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="background:#FFFFFF;padding:20px 32px 8px;">
              <p style="margin:0;font-size:15px;color:#374151;">${greeting}, aquí está tu resumen de visitas de la semana pasada.</p>
            </td>
          </tr>

          <!-- Stats -->
          <tr>
            <td style="background:#FFFFFF;padding:12px 32px 20px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="
                    background:#EFF6FF;
                    border-radius:8px;
                    padding:10px 20px;
                    text-align:center;
                    margin-right:12px;
                  ">
                    <div style="font-size:28px;font-weight:700;color:#1D4ED8;">${visits.length}</div>
                    <div style="font-size:12px;color:#6B7280;margin-top:2px;">visita${visits.length !== 1 ? 's' : ''}</div>
                  </td>
                  <td width="12"></td>
                  <td style="
                    background:#F0FDF4;
                    border-radius:8px;
                    padding:10px 20px;
                    text-align:center;
                  ">
                    <div style="font-size:28px;font-weight:700;color:#16A34A;">${visits.filter((v) => v.status === 'completed').length}</div>
                    <div style="font-size:12px;color:#6B7280;margin-top:2px;">completada${visits.filter((v) => v.status === 'completed').length !== 1 ? 's' : ''}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Visit table -->
          <tr>
            <td style="background:#FFFFFF;border-top:1px solid #E5E7EB;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${rows}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#FFFFFF;padding:20px 32px;border-top:1px solid #E5E7EB;border-radius:0 0 12px 12px;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
                Este email fue generado automáticamente por CRM Proar.
              </p>
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

  const body: Record<string, unknown> = {
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  }
  if (opts.replyTo) body['reply_to'] = opts.replyTo

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { from, to, label } = getLastWeekRange()

    // Fetch all profiles with email enabled
    const { data: profiles, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, full_name, email_config')
      .not('email_config', 'is', null)

    if (profilesErr) throw profilesErr

    const results: { userId: string; status: string }[] = []

    for (const profile of (profiles as Profile[]) ?? []) {
      const config = profile.email_config
      if (!config?.enabled || !config.recipients?.length) continue

      // Fetch last week's visits for this user
      const { data: visits, error: visitsErr } = await supabase
        .from('visits')
        .select('id, scheduled_at, status, notes, client:clients(id, name, address, city)')
        .eq('owner_user_id', profile.id)
        .gte('scheduled_at', from)
        .lte('scheduled_at', to)
        .order('scheduled_at')

      if (visitsErr) {
        results.push({ userId: profile.id, status: `error: ${visitsErr.message}` })
        continue
      }

      if (!visits?.length) {
        results.push({ userId: profile.id, status: 'skipped: no visits last week' })
        continue
      }

      const html = generateHtml(profile, visits as Visit[], label)

      const mailFromName = Deno.env.get('MAIL_FROM_NAME') ?? 'Proar CRM'
      const mailFromAddress = Deno.env.get('MAIL_FROM_ADDRESS') ?? 'onboarding@resend.dev'

      await sendEmail({
        from: `${mailFromName} <${mailFromAddress}>`,
        replyTo: config.sender ?? undefined,
        to: config.recipients,
        subject: `Resumen de visitas: ${label}`,
        html,
      })

      results.push({ userId: profile.id, status: `sent to ${config.recipients.length} recipient(s)` })
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('weekly-email error:', message)
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
