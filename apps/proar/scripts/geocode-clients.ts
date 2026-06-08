/**
 * scripts/geocode-clients.ts — One-time backfill script to geocode all clients
 *
 * Fetches all clients where latitude IS NULL, calls Nominatim for each,
 * and updates the database. Respects Nominatim rate limits with 1.1s delays.
 *
 * Usage:
 *   yarn geocode
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    '❌ Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeClients() {
  console.log('🌍 Starting client geocoding backfill...\n');

  // Fetch all clients where latitude IS NULL
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, address, city')
    .is('latitude', null);

  if (error) {
    console.error('❌ Error fetching clients:', error.message);
    process.exit(1);
  }

  if (!clients || clients.length === 0) {
    console.log('✅ No clients need geocoding.');
    process.exit(0);
  }

  console.log(`📍 Found ${clients.length} clients to geocode\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    if (!client.address || !client.city) {
      console.log(
        `[${i + 1}/${clients.length}] ⏭️  ${client.name} — no address/city, skipping`
      );
      failed++;
      continue;
    }

    try {
      const query = encodeURIComponent(
        `${client.address}, ${client.city}, Argentina`
      );
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
        {
          headers: { 'User-Agent': 'CRM-Proar-Pilar/1.0' },
        }
      );

      if (!response.ok) {
        console.log(
          `[${i + 1}/${clients.length}] ⚠️  ${client.name} — HTTP ${response.status}`
        );
        failed++;
        await sleep(1100);
        continue;
      }

      const results = await response.json();
      if (!results || results.length === 0) {
        console.log(
          `[${i + 1}/${clients.length}] ⚠️  ${client.name} — no results from Nominatim`
        );
        failed++;
        await sleep(1100);
        continue;
      }

      const { lat, lon } = results[0];
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);

      if (isNaN(latitude) || isNaN(longitude)) {
        console.log(
          `[${i + 1}/${clients.length}] ⚠️  ${client.name} — invalid coordinates`
        );
        failed++;
        await sleep(1100);
        continue;
      }

      // Update in database
      const { error: updateError } = await supabase
        .from('clients')
        .update({ latitude, longitude })
        .eq('id', client.id);

      if (updateError) {
        console.log(
          `[${i + 1}/${clients.length}] ❌ ${client.name} — ${updateError.message}`
        );
        failed++;
      } else {
        console.log(
          `[${i + 1}/${clients.length}] ✅ ${client.name} → (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
        );
        success++;
      }

      // Respect rate limit: 1 request per second minimum
      if (i < clients.length - 1) {
        await sleep(1100);
      }
    } catch (err) {
      console.log(
        `[${i + 1}/${clients.length}] ❌ ${client.name} — ${err instanceof Error ? err.message : 'unknown error'}`
      );
      failed++;
      await sleep(1100);
    }
  }

  console.log(
    `\n🎉 Geocoding complete: ${success} succeeded, ${failed} failed`
  );
  process.exit(failed > 0 ? 1 : 0);
}

geocodeClients();
