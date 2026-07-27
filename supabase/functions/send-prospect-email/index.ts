/**
 * supabase/functions/send-prospect-email/index.ts
 *
 * Renders email templates with per-recipient variables, sends via Resend,
 * and logs each send to public.email_sends.
 *
 * Request body:
 *   {
 *     templateId: string;
 *     recipients: Array<{
 *       email: string;
 *       name?: string;
 *       prospectId?: string;
 *       variables: Record<string, string>;  // e.g. { prospectName, contactName, senderName }
 *     }>;
 *   }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Recipient {
  email: string;
  name?: string;
  prospectId?: string;
  variables: Record<string, string>;
}

interface RequestBody {
  templateId?: string;
  subject?: string;
  body?: string;
  signatureId?: string;
  recipients: Recipient[];
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  company_id: string;
}

interface Profile {
  id: string;
  company_id: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '');
}

function textToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY')!;
    const fromAddress = Deno.env.get('MAIL_FROM_ADDRESS') ?? 'noreply@gemm-apps.com';

    // ── 1. Auth ─────────────────────────────────────────────────────────────

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing authorization header' }, 401);
    }
    const jwt = authHeader.slice(7);

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // ── 2. Caller profile ────────────────────────────────────────────────────

    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, company_id')
      .eq('id', user.id)
      .single<Profile>();

    if (!profile?.company_id) return jsonResponse({ error: 'Profile not found' }, 403);

    // ── 3. Parse body ────────────────────────────────────────────────────────

    let body: RequestBody;
    try {
      body = await req.json() as RequestBody;
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const { templateId, recipients } = body;
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return jsonResponse({ error: 'recipients are required' }, 400);
    }

    // ── 4. Load template (or use inline subject+body) ───────────────────────

    let template: EmailTemplate | null = null;

    if (templateId) {
      const { data } = await adminClient
        .from('email_templates')
        .select('id, name, subject, body, company_id')
        .eq('id', templateId)
        .single<EmailTemplate>();

      if (!data) return jsonResponse({ error: 'Template not found' }, 404);
      if (data.company_id !== profile.company_id) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }
      template = data;
    } else if (body.subject && body.body) {
      template = { id: '', name: 'Texto libre', subject: body.subject, body: body.body, company_id: profile.company_id };
    } else {
      return jsonResponse({ error: 'templateId or subject+body required' }, 400);
    }

    // ── 5. Load signature (optional) ────────────────────────────────────────

    let signatureHtml = '';
    if (body.signatureId) {
      const { data: sig } = await adminClient
        .from('email_signatures')
        .select('body_html, company_id')
        .eq('id', body.signatureId)
        .single<{ body_html: string; company_id: string }>();
      if (sig && sig.company_id === profile.company_id) {
        signatureHtml = sig.body_html;
      }
    }

    // ── 6. Send emails ───────────────────────────────────────────────────────

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      if (!recipient.email) continue;

      const vars = recipient.variables ?? {};
      const subject = renderTemplate(template.subject, vars);
      const bodyText = renderTemplate(template.body, vars);
      const bodyHtml = textToHtml(bodyText);

      let resendMessageId: string | null = null;
      let errorMessage: string | null = null;
      let status: 'sent' | 'failed' = 'failed';

      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `gemm-apps CRM <${fromAddress}>`,
            to: recipient.name
              ? [`${recipient.name} <${recipient.email}>`]
              : [recipient.email],
            subject,
            text: bodyText,
            html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#111;">${bodyHtml}</div>${signatureHtml ? `<br><div style="margin-top:16px;border-top:1px solid #e0e0e0;padding-top:12px;">${signatureHtml}</div>` : ''}`,
          }),
        });

        if (resendRes.ok) {
          const resendData = await resendRes.json() as { id?: string };
          resendMessageId = resendData.id ?? null;
          status = 'sent';
          sent++;
        } else {
          const errData = await resendRes.json().catch(() => ({})) as { message?: string };
          errorMessage = errData.message ?? `HTTP ${resendRes.status}`;
          failed++;
        }
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : String(err);
        failed++;
      }

      // Log to email_sends regardless of outcome
      await adminClient.from('email_sends').insert({
        company_id: profile.company_id,
        sender_user_id: user.id,
        template_id: template.id,
        template_name: template.name,
        prospect_id: recipient.prospectId ?? null,
        recipient_email: recipient.email,
        recipient_name: recipient.name ?? null,
        subject,
        status,
        resend_message_id: resendMessageId,
        error_message: errorMessage,
      });
    }

    return jsonResponse({ sent, failed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('send-prospect-email error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
