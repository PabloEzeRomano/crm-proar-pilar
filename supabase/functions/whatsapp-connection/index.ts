/**
 * supabase/functions/whatsapp-connection/index.ts
 *
 * Check Baileys server instance connection state and return QR code if disconnected.
 *
 * GET  → { state: "open" | "close" | "connecting" | "qr", qr?: { base64 } }
 *
 * Secrets required:
 *   BAILEYS_API_URL   https://baileys-server-production.up.railway.app
 *   BAILEYS_API_KEY   API key set in Railway env
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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const baileysUrl = Deno.env.get('BAILEYS_API_URL')!;
    const baileysKey = Deno.env.get('BAILEYS_API_KEY')!;

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

    const { data: profile } = await adminClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single<{ company_id: string }>();
    if (!profile?.company_id) return json({ error: 'Profile not found' }, 403);

    const { data: config } = await adminClient
      .from('company_config')
      .select('whatsapp_instance')
      .eq('company_id', profile.company_id)
      .single<{ whatsapp_instance: string | null }>();

    if (!config?.whatsapp_instance) {
      return json({ error: 'WhatsApp no configurado', state: 'not_configured' }, 422);
    }

    const instance = config.whatsapp_instance;
    const headers = { 'x-api-key': baileysKey };

    // Get QR endpoint returns both state and QR in one call
    const qrRes = await fetch(`${baileysUrl}/qr/${instance}`, { headers });
    const qrData = await qrRes.json().catch(() => ({}));
    const state: string = qrData?.state ?? 'unknown';

    return json({ state, qr: qrData?.qr ?? null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('whatsapp-connection error:', message);
    return json({ error: message }, 500);
  }
});
