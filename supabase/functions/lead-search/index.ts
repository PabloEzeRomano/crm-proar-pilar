/**
 * supabase/functions/lead-search/index.ts
 *
 * Creates a lead_searches row and immediately returns the searchId.
 * All heavy work (Places API + AI) runs in EdgeRuntime.waitUntil()
 * so the mobile app gets a fast response and then polls/subscribes via Realtime.
 *
 * Request body:
 *   { query, locationText, radiusMeters?, minRating?, minReviews? }
 *
 * Required secrets:
 *   GOOGLE_PLACES_API_KEY   — Google Cloud Console, Places API (New) only
 *   GOOGLE_GEMINI_API_KEY   — Google AI Studio
 *   GROQ_API_KEY            — console.groq.com (fallback #1)
 *   MISTRAL_API_KEY         — console.mistral.ai (fallback #2)
 *
 * No Geocoding API needed: location is embedded in the text query.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RequestBody {
  query: string;
  locationText: string;
  radiusMeters?: number;
  minRating?: number | null;
  minReviews?: number | null;
}

interface PlaceStub {
  googlePlaceId: string;
  name: string;
  category: string | null;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

interface PlaceDetails {
  phone: string | null;
  website: string | null;
  openingHours: string[] | null;
  reviews: PlaceReview[];
}

interface PlaceReview {
  author: string;
  rating: number;
  text: string;
  time: string;
}

interface AiAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  painPoints: string[];
  salesOpportunityScore: number;
  recommendedPitch: string;
  recommendedProduct: 'crm' | 'miturno' | 'qrtify';
  tags: string[];
}

// ── CORS ──────────────────────────────────────────────────────────────────────

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

// ── Google Places helpers ─────────────────────────────────────────────────────

async function fetchPlacesPage(
  query: string,
  locationText: string,
  apiKey: string,
  pageToken?: string,
): Promise<{ places: PlaceStub[]; nextPageToken: string | null }> {
  // Embed location in query — Places API (New) resolves it natively.
  // No Geocoding API call needed.
  const body: Record<string, unknown> = {
    textQuery: `${query} en ${locationText}`,
    maxResultCount: 20,
  };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.primaryType,places.rating,places.userRatingCount,places.formattedAddress,places.location,nextPageToken',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error('Places searchText error:', res.status, await res.text());
    return { places: [], nextPageToken: null };
  }

  const data = await res.json() as {
    places?: Array<{
      id: string;
      displayName?: { text: string };
      primaryType?: string;
      rating?: number;
      userRatingCount?: number;
      formattedAddress?: string;
      location?: { latitude: number; longitude: number };
    }>;
    nextPageToken?: string;
  };

  const places: PlaceStub[] = (data.places ?? []).map((p) => ({
    googlePlaceId: p.id,
    name: p.displayName?.text ?? '',
    category: p.primaryType ?? null,
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? null,
    address: p.formattedAddress ?? null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
  }));

  return { places, nextPageToken: data.nextPageToken ?? null };
}

async function fetchPlaceDetails(
  googlePlaceId: string,
  apiKey: string,
): Promise<PlaceDetails> {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${googlePlaceId}`,
    {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'nationalPhoneNumber,websiteUri,regularOpeningHours.weekdayDescriptions,reviews',
      },
    },
  );

  if (!res.ok) {
    return { phone: null, website: null, openingHours: null, reviews: [] };
  }

  const data = await res.json() as {
    nationalPhoneNumber?: string;
    websiteUri?: string;
    regularOpeningHours?: { weekdayDescriptions?: string[] };
    reviews?: Array<{
      authorAttribution?: { displayName?: string };
      rating?: number;
      text?: { text?: string };
      publishTime?: string;
    }>;
  };

  const reviews: PlaceReview[] = (data.reviews ?? [])
    .filter((r) => r.text?.text)
    .slice(0, 10)
    .map((r) => ({
      author: r.authorAttribution?.displayName ?? 'Anónimo',
      rating: r.rating ?? 0,
      text: r.text?.text ?? '',
      time: r.publishTime ?? '',
    }));

  return {
    phone: data.nationalPhoneNumber ?? null,
    website: data.websiteUri ?? null,
    openingHours: data.regularOpeningHours?.weekdayDescriptions ?? null,
    reviews,
  };
}

// ── AI analysis waterfall: Gemini → Groq → Mistral ───────────────────────────

const AI_PROMPT = (name: string, category: string, reviews: PlaceReview[]): string => {
  const reviewText = reviews.length > 0
    ? reviews.map((r) => `[${r.rating}★] ${r.text}`).join('\n')
    : 'Sin reseñas disponibles.';

  return `Eres un analista de ventas B2B para gemm-apps, empresa que vende:
- "crm": CRM para vendedores de campo
- "miturno": sistema de turnos online para negocios con clientes que esperan
- "qrtify": menú/catálogo digital QR para negocios gastronómicos o con productos

Analiza este negocio y devuelve ÚNICAMENTE un objeto JSON válido, sin markdown ni texto extra.

Negocio: ${name}
Categoría: ${category || 'No especificada'}

Reseñas de clientes:
${reviewText}

Responde con este JSON exacto:
{
  "summary": "Resumen de 1-2 oraciones del negocio y su situación",
  "strengths": ["fortaleza 1", "fortaleza 2"],
  "weaknesses": ["debilidad 1", "debilidad 2"],
  "painPoints": ["problema operativo 1", "problema operativo 2"],
  "salesOpportunityScore": 0,
  "recommendedPitch": "Pitch de venta de 1-2 oraciones enfocado en el pain point principal",
  "recommendedProduct": "crm",
  "tags": ["tag1", "tag2"]
}

salesOpportunityScore: 0-100 (cuán probable es que compren alguno de nuestros productos).
recommendedProduct: elige el producto más adecuado para este negocio.`;
};

async function analyzeWithGemini(
  name: string,
  category: string,
  reviews: PlaceReview[],
  apiKey: string,
): Promise<AiAnalysis | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: AI_PROMPT(name, category, reviews) }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error(`Gemini ${res.status}`);

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  return JSON.parse(text) as AiAnalysis;
}

async function analyzeWithGroq(
  name: string,
  category: string,
  reviews: PlaceReview[],
  apiKey: string,
): Promise<AiAnalysis | null> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: AI_PROMPT(name, category, reviews) }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error(`Groq ${res.status}`);

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) return null;
  return JSON.parse(text) as AiAnalysis;
}

async function analyzeWithMistral(
  name: string,
  category: string,
  reviews: PlaceReview[],
  apiKey: string,
): Promise<AiAnalysis | null> {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: AI_PROMPT(name, category, reviews) }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error(`Mistral ${res.status}`);

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) return null;
  return JSON.parse(text) as AiAnalysis;
}

async function analyzePlace(
  name: string,
  category: string,
  reviews: PlaceReview[],
  geminiKey: string,
  groqKey: string,
  mistralKey: string,
): Promise<AiAnalysis | null> {
  const providers = [
    () => analyzeWithGemini(name, category, reviews, geminiKey),
    () => analyzeWithGroq(name, category, reviews, groqKey),
    () => analyzeWithMistral(name, category, reviews, mistralKey),
  ];

  for (const provider of providers) {
    try {
      const result = await provider();
      if (result) return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`AI provider failed (${msg}), trying next...`);
    }
  }

  console.error('All AI providers exhausted for:', name);
  return null;
}

// ── Background processor ──────────────────────────────────────────────────────

async function processSearch(
  searchId: string,
  params: {
    query: string;
    locationText: string;
    minRating: number | null;
    minReviews: number | null;
    companyId: string;
  },
  adminClient: ReturnType<typeof createClient>,
  placesKey: string,
  geminiKey: string,
  groqKey: string,
  mistralKey: string,
): Promise<void> {
  const { query, locationText, minRating, minReviews, companyId } = params;

  try {
    await adminClient
      .from('lead_searches')
      .update({ status: 'running' })
      .eq('id', searchId);

    // ── Phase 1: collect all place stubs ──────────────────────────────────

    const allStubs: PlaceStub[] = [];
    let pageToken: string | undefined;
    let pageCount = 0;

    do {
      const { places, nextPageToken } = await fetchPlacesPage(
        query, locationText, placesKey, pageToken,
      );

      const filtered = places.filter((p) => {
        if (minRating != null && (p.rating ?? 0) < minRating) return false;
        if (minReviews != null && (p.reviewCount ?? 0) < minReviews) return false;
        return true;
      });

      allStubs.push(...filtered);
      pageToken = nextPageToken ?? undefined;
      pageCount++;

      // Between pages: mandatory 2s wait (Places API requirement) + avoid hammering
      if (nextPageToken && pageCount < 3) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    } while (pageToken && pageCount < 3);

    await adminClient
      .from('lead_searches')
      .update({ total_found: allStubs.length })
      .eq('id', searchId);

    if (allStubs.length === 0) {
      await adminClient
        .from('lead_searches')
        .update({ status: 'done' })
        .eq('id', searchId);
      return;
    }

    // ── Phase 2: details + AI per stub ────────────────────────────────────

    let processed = 0;

    for (const stub of allStubs) {
      try {
        // Upsert the stub first so the card appears immediately in the app
        await adminClient.from('lead_places').upsert(
          {
            search_id: searchId,
            company_id: companyId,
            google_place_id: stub.googlePlaceId,
            name: stub.name,
            category: stub.category,
            rating: stub.rating,
            review_count: stub.reviewCount,
            address: stub.address,
            lat: stub.lat,
            lng: stub.lng,
          },
          { onConflict: 'company_id,google_place_id', ignoreDuplicates: false },
        );

        // Fetch details
        const details = await fetchPlaceDetails(stub.googlePlaceId, placesKey);

        // AI analysis
        const ai = await analyzePlace(
          stub.name,
          stub.category ?? '',
          details.reviews,
          geminiKey,
          groqKey,
          mistralKey,
        );

        // Update with full data
        await adminClient
          .from('lead_places')
          .update({
            phone: details.phone,
            website: details.website,
            opening_hours: details.openingHours,
            reviews: details.reviews,
            ai_analysis: ai,
          })
          .eq('search_id', searchId)
          .eq('google_place_id', stub.googlePlaceId);

        processed++;

        await adminClient
          .from('lead_searches')
          .update({ processed })
          .eq('id', searchId);

        // Small delay to stay within rate limits
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        console.error(`Error processing place ${stub.name}:`, err);
        processed++;
        await adminClient
          .from('lead_searches')
          .update({ processed })
          .eq('id', searchId);
      }
    }

    await adminClient
      .from('lead_searches')
      .update({ status: 'done', processed })
      .eq('id', searchId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('processSearch fatal error:', message);
    await adminClient
      .from('lead_searches')
      .update({ status: 'error', error_message: message })
      .eq('id', searchId);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const placesKey = Deno.env.get('GOOGLE_PLACES_API_KEY')!;
    const geminiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY')!;
    const groqKey = Deno.env.get('GROQ_API_KEY') ?? '';
    const mistralKey = Deno.env.get('MISTRAL_API_KEY') ?? '';

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
    let body: RequestBody;
    try {
      body = await req.json() as RequestBody;
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const { query, locationText, minRating = null, minReviews = null } = body;
    if (!query?.trim() || !locationText?.trim()) {
      return jsonResponse({ error: 'query and locationText are required' }, 400);
    }

    // Create search row
    const { data: search, error: insertErr } = await adminClient
      .from('lead_searches')
      .insert({
        company_id: profile.company_id,
        created_by: user.id,
        status: 'pending',
        query: query.trim(),
        location_text: locationText.trim(),
        radius_meters: 5000,
        min_rating: minRating,
        min_reviews: minReviews,
      })
      .select('id')
      .single<{ id: string }>();

    if (insertErr || !search) {
      return jsonResponse({ error: 'Failed to create search' }, 500);
    }

    // Respond immediately — background job runs via waitUntil
    EdgeRuntime.waitUntil(
      processSearch(
        search.id,
        {
          query: query.trim(),
          locationText: locationText.trim(),
          minRating,
          minReviews,
          companyId: profile.company_id,
        },
        adminClient,
        placesKey,
        geminiKey,
        groqKey,
        mistralKey,
      ),
    );

    return jsonResponse({ searchId: search.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('lead-search error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
