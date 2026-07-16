/**
 * supabase/functions/lead-import/index.ts
 *
 * Imports a lead_places row into the CRM as a prospect.
 * Prevents duplicates: if the place already has a prospect_id, returns it.
 *
 * Request body: { placeId: string }  ← lead_places.id (UUID)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

interface LeadPlace {
  id: string;
  company_id: string;
  google_place_id: string;
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  ai_analysis: {
    recommendedPitch?: string;
    recommendedProduct?: string;
    summary?: string;
  } | null;
  prospect_id: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Auth
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

    const { data: profile } = await adminClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single<{ company_id: string }>();

    if (!profile?.company_id) return jsonResponse({ error: 'Profile not found' }, 403);

    // Parse body
    let body: { placeId?: string; product?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    if (!body.placeId) return jsonResponse({ error: 'placeId is required' }, 400);

    // Fetch the place — must belong to caller's company
    const { data: place, error: placeErr } = await adminClient
      .from('lead_places')
      .select('id, company_id, google_place_id, name, category, address, phone, website, ai_analysis, prospect_id')
      .eq('id', body.placeId)
      .eq('company_id', profile.company_id)
      .single<LeadPlace>();

    if (placeErr || !place) return jsonResponse({ error: 'Place not found' }, 404);

    // Already imported — return existing prospectId (idempotent)
    if (place.prospect_id) {
      return jsonResponse({ prospectId: place.prospect_id, alreadyImported: true });
    }

    // Build contacts array from phone
    const contacts = place.phone
      ? [{ phone: place.phone }]
      : [];

    // Build notes from AI analysis + website
    const noteParts: string[] = [];
    if (place.ai_analysis?.summary) {
      noteParts.push(`Análisis AI: ${place.ai_analysis.summary}`);
    }
    if (place.ai_analysis?.recommendedPitch) {
      noteParts.push(`Pitch sugerido: ${place.ai_analysis.recommendedPitch}`);
    }
    if (place.website) {
      noteParts.push(`Web: ${place.website}`);
    }
    noteParts.push(`Fuente: Google Maps (${place.google_place_id})`);
    const notes = noteParts.join('\n\n');

    const validProducts = ['crm', 'miturno', 'qrtify'] as const;
    type Product = typeof validProducts[number];
    // User-selected product takes priority; fall back to AI recommendation, then 'crm'
    const rawProduct = body.product ?? place.ai_analysis?.recommendedProduct;
    const product: Product = validProducts.includes(rawProduct as Product)
      ? (rawProduct as Product)
      : 'crm';

    // Create prospect
    const { data: prospect, error: prospectErr } = await adminClient
      .from('prospects')
      .insert({
        owner_user_id: user.id,
        company_id: profile.company_id,
        name: place.name,
        contacts,
        industry: place.category,
        address: place.address,
        product,
        stage: 'lead',
        notes,
      })
      .select('id')
      .single<{ id: string }>();

    if (prospectErr || !prospect) {
      console.error('prospect insert error:', prospectErr);
      return jsonResponse({ error: 'Failed to create prospect' }, 500);
    }

    // Mark place as imported
    await adminClient
      .from('lead_places')
      .update({ prospect_id: prospect.id, imported_at: new Date().toISOString() })
      .eq('id', place.id);

    return jsonResponse({ prospectId: prospect.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('lead-import error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
