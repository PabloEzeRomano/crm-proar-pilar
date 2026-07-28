/**
 * supabase/functions/whatsapp-connection/index.ts
 *
 * Check Evolution API instance connection state and return QR code if disconnected.
 *
 * GET  → { state: "open" | "close" | "connecting", qr?: { base64, code } }
 * POST → force reconnect, returns same shape
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

    // Check connection state
    const stateRes = await fetch(
      `${evolutionUrl}/instance/connectionState/${instance}`,
      { headers: { apikey: evolutionKey } }
    );
    const stateData = await stateRes.json().catch(() => ({}));
    const state: string = stateData?.instance?.state ?? stateData?.state ?? 'unknown';

    // If not open, try to get QR code for reconnection
    if (state !== 'open') {
      const connectRes = await fetch(
        `${evolutionUrl}/instance/connect/${instance}`,
        { headers: { apikey: evolutionKey } }
      );
      const connectData = await connectRes.json().catch(() => ({}));
      const base64 = connectData?.base64 ?? null;
      const code = connectData?.code ?? connectData?.pairingCode ?? null;

      return json({ state, qr: base64 ? { base64, code } : null });
    }

    return json({ state });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('whatsapp-connection error:', message);
    return json({ error: message }, 500);
  }
});
