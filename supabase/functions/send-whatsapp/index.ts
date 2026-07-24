/**
 * supabase/functions/send-whatsapp/index.ts
 *
 * Sends a WhatsApp message via Evolution API and logs it to whatsapp_sends.
 *
 * Request body:
 *   {
 *     recipientPhone: string;   // international format, no + (e.g. "5491112345678")
 *     body: string;             // message text
 *     recipientName?: string;
 *     prospectId?: string;
 *     templateId?: string;
 *   }
 *
 * Secrets required (Supabase → Edge Functions → send-whatsapp):
 *   EVOLUTION_API_URL   https://evolution-api-production-9f0d5.up.railway.app
 *   EVOLUTION_API_KEY   global API key from Railway env
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!;
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')!;
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY')!;

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const jwt = authHeader.slice(7);

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401);

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get company + whatsapp instance
    const { data: profile } = await adminClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single<{ company_id: string }>();
    if (!profile?.company_id) return json({ error: 'Profile not found' }, 403);

    const { data: config } = await adminClient
      .from('company_config')
      .select('whatsapp_instance, whatsapp_connected')
      .eq('company_id', profile.company_id)
      .single<{ whatsapp_instance: string | null; whatsapp_connected: boolean }>();

    if (!config?.whatsapp_instance) {
      return json({ error: 'WhatsApp no configurado para esta empresa' }, 422);
    }

    // Parse body
    let body: {
      recipientPhone: string;
      body: string;
      recipientName?: string;
      prospectId?: string;
      templateId?: string;
    };
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    if (!body.recipientPhone || !body.body) {
      return json({ error: 'recipientPhone y body son requeridos' }, 400);
    }

    // Normalize phone: strip spaces, dashes, leading +
    const phone = body.recipientPhone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');

    // Call Evolution API
    const evolutionRes = await fetch(
      `${evolutionUrl}/message/sendText/${config.whatsapp_instance}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: evolutionKey,
        },
        body: JSON.stringify({
          number: phone,
          text: body.body,
        }),
      }
    );

    const evolutionData = await evolutionRes.json().catch(() => ({}));
    const success = evolutionRes.ok;
    const evolutionMessageId: string | null =
      evolutionData?.key?.id ?? evolutionData?.messageId ?? null;

    // Log to whatsapp_sends
    await adminClient.from('whatsapp_sends').insert({
      company_id:           profile.company_id,
      sender_user_id:       user.id,
      prospect_id:          body.prospectId ?? null,
      template_id:          body.templateId ?? null,
      recipient_phone:      phone,
      recipient_name:       body.recipientName ?? null,
      body:                 body.body,
      evolution_message_id: evolutionMessageId,
      status:               success ? 'sent' : 'failed',
      error_message:        success ? null : JSON.stringify(evolutionData),
    });

    if (!success) {
      return json({ error: 'Evolution API error', detail: evolutionData }, 502);
    }

    return json({ ok: true, messageId: evolutionMessageId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('send-whatsapp error:', message);
    return json({ error: message }, 500);
  }
});
