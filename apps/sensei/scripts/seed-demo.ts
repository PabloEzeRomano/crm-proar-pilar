/**
 * apps/sensei/scripts/seed-demo.ts — One-off demo seed for Sensei.
 *
 * Loads semi-real data from two Excel files into the Sensei data model under a
 * dedicated "SyS SA" company (crm_type = campaign-management):
 *   - branches      ← distinct "Unidad De Negocio" (Empleados.xlsx)
 *   - clients       ← first N rows of Clientes.xlsx
 *   - rejection_reasons, campaign + offers
 *   - client_assignments ← a slice of clients assigned to the demo owner
 *   - interactions  ← sample activity so the dashboard shows metrics
 *
 * Uses the service-role key (bypasses RLS). Idempotent: safe to re-run.
 *
 * Run:  npx tsx apps/sensei/scripts/seed-demo.ts
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const EMPLOYEES_XLSX = join(
  homedir(),
  'Downloads/Listado de Empleados SyS SA.xlsx'
);
const CLIENTS_XLSX = join(homedir(), 'Downloads/Clientes SyS SA.xlsx');

const COMPANY_NAME = 'SyS SA';
const CLIENT_LIMIT = 300;
const ASSIGN_COUNT = 120; // clients assigned to the demo owner
const INTERACTION_COUNT = 60; // sample interactions

// Demo owner / seller (Pablo, root). All data is owned/assigned to this user.
const OWNER_ID = '9149ddf1-8bdc-4a5a-bf0b-a34e3fb69f43';

// ---------------------------------------------------------------------------
// Env + client
// ---------------------------------------------------------------------------

function loadEnv(): { url: string; serviceKey: string } {
  const envPath = join(__dirname, '../../../.env');
  const raw = readFileSync(envPath, 'utf8');
  const get = (key: string) => {
    const line = raw.split('\n').find((l) => l.startsWith(`${key}=`));
    return line ? line.slice(key.length + 1).trim() : '';
  };
  const url = get('EXPO_PUBLIC_SUPABASE_URL');
  const serviceKey = get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) throw new Error('Missing Supabase env vars');
  return { url, serviceKey };
}

const { url, serviceKey } = loadEnv();
const db = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readSheet(path: string): Record<string, unknown>[] {
  const wb = XLSX.readFile(path);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

// ---------------------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------------------

async function ensureCompany(): Promise<string> {
  const { data: existing } = await db
    .from('companies')
    .select('id')
    .eq('name', COMPANY_NAME)
    .maybeSingle<{ id: string }>();

  let companyId = existing?.id;
  if (!companyId) {
    const { data, error } = await db
      .from('companies')
      .insert({ name: COMPANY_NAME })
      .select('id')
      .single<{ id: string }>();
    if (error) throw error;
    companyId = data.id;
    console.log('created company', companyId);
  } else {
    console.log('company exists', companyId);
  }

  await db.from('company_config').upsert(
    {
      company_id: companyId,
      crm_type: 'campaign-management',
      max_users: 20,
    },
    { onConflict: 'company_id' }
  );

  return companyId;
}

async function seedBranches(companyId: string): Promise<string[]> {
  const rows = readSheet(EMPLOYEES_XLSX);
  const names = [
    ...new Set(
      rows
        .map((r) => str(r['Unidad De Negocio']))
        .filter((n): n is string => !!n)
    ),
  ];

  for (const name of names) {
    const { data: ex } = await db
      .from('branches')
      .select('id')
      .eq('company_id', companyId)
      .eq('name', name)
      .maybeSingle<{ id: string }>();
    if (!ex) {
      await db.from('branches').insert({ company_id: companyId, name, city: name });
    }
  }

  const { data } = await db
    .from('branches')
    .select('id')
    .eq('company_id', companyId);
  console.log(`branches: ${data?.length ?? 0}`);
  return (data ?? []).map((b) => b.id as string);
}

interface ContactInfo {
  name?: string;
  phone?: string;
  email?: string;
}

async function seedClients(companyId: string): Promise<string[]> {
  const rows = readSheet(CLIENTS_XLSX)
    .filter((r) => str(r['Apellido y nombre']))
    .slice(0, CLIENT_LIMIT);

  for (const r of rows) {
    const name = str(r['Apellido y nombre'])!;
    const cuit = str(r['Documento']);

    const phone = str(r['Celular']) ?? str(r['Teléfono']) ?? str(r['Fijo']);
    const email = str(r['E-mail']);
    const contacts: ContactInfo[] = [];
    if (phone || email) {
      contacts.push({
        ...(phone ? { phone } : {}),
        ...(email ? { email } : {}),
      });
    }

    // Dedupe by company + name + cuit
    const { data: ex } = await db
      .from('clients')
      .select('id')
      .eq('company_id', companyId)
      .eq('name', name)
      .eq('cuit', cuit ?? '')
      .maybeSingle<{ id: string }>();
    if (ex) continue;

    await db.from('clients').insert({
      company_id: companyId,
      owner_user_id: OWNER_ID,
      name,
      cuit,
      address: str(r['Domicilo']),
      city: str(r['Localidad']),
      zone: str(r['Provincia']),
      commercial_classification: str(r['Calificación']),
      industry: str(r['Ocupación']),
      contacts,
    });
  }

  const { data } = await db
    .from('clients')
    .select('id')
    .eq('company_id', companyId)
    .limit(CLIENT_LIMIT);
  console.log(`clients: ${data?.length ?? 0}`);
  return (data ?? []).map((c) => c.id as string);
}

async function seedRejectionReasons(companyId: string) {
  const values = [
    'Precio alto',
    'No le interesa el producto',
    'Ya tiene proveedor',
    'No es el momento',
    'Sin capacidad de pago',
  ];
  for (const value of values) {
    const { data: ex } = await db
      .from('rejection_reasons')
      .select('id')
      .eq('company_id', companyId)
      .eq('value', value)
      .maybeSingle<{ id: string }>();
    if (!ex)
      await db
        .from('rejection_reasons')
        .insert({ company_id: companyId, value });
  }
  const { data } = await db
    .from('rejection_reasons')
    .select('id')
    .eq('company_id', companyId);
  console.log(`rejection_reasons: ${data?.length ?? 0}`);
  return (data ?? []).map((x) => x.id as string);
}

async function ensureCampaign(companyId: string): Promise<string> {
  const name = 'Campaña Verano 2026';
  const { data: ex } = await db
    .from('campaigns')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', name)
    .maybeSingle<{ id: string }>();
  let campaignId = ex?.id;
  if (!campaignId) {
    const { data, error } = await db
      .from('campaigns')
      .insert({
        company_id: companyId,
        name,
        description: 'Campaña de financiación y promociones de verano.',
        status: 'active',
        priority: 1,
      })
      .select('id')
      .single<{ id: string }>();
    if (error) throw error;
    campaignId = data.id;
  }

  // Offers
  const offers = [
    {
      name: 'Plan 6 cuotas sin interés',
      payment_methods: ['tarjeta', 'efectivo'],
      financing: '6 cuotas',
    },
    {
      name: 'Contado con 15% off',
      payment_methods: ['efectivo', 'transferencia'],
      financing: 'contado',
    },
  ];
  for (const o of offers) {
    const { data: oex } = await db
      .from('campaign_offers')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('name', o.name)
      .maybeSingle<{ id: string }>();
    if (!oex)
      await db.from('campaign_offers').insert({ campaign_id: campaignId, ...o });
  }
  console.log('campaign', campaignId);
  return campaignId;
}

async function seedAssignments(
  campaignId: string,
  clientIds: string[],
  branchIds: string[]
): Promise<{ id: string; client_id: string }[]> {
  const slice = clientIds.slice(0, ASSIGN_COUNT);
  const statuses = ['pending', 'pending', 'in_progress', 'completed'];

  for (let i = 0; i < slice.length; i++) {
    await db.from('client_assignments').upsert(
      {
        campaign_id: campaignId,
        client_id: slice[i],
        assigned_to: OWNER_ID,
        assigned_by: OWNER_ID,
        branch_id: branchIds.length ? pick(branchIds, i) : null,
        status: pick(statuses, i),
      },
      { onConflict: 'campaign_id,client_id,assigned_to' }
    );
  }

  const { data } = await db
    .from('client_assignments')
    .select('id, client_id')
    .eq('campaign_id', campaignId);
  console.log(`assignments: ${data?.length ?? 0}`);
  return (data ?? []) as { id: string; client_id: string }[];
}

async function seedInteractions(
  campaignId: string,
  assignments: { id: string; client_id: string }[],
  reasonIds: string[]
) {
  // Guard: only seed if none exist yet for this campaign.
  const { count } = await db
    .from('interactions')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);
  if ((count ?? 0) > 0) {
    console.log(`interactions: ${count} (already seeded, skipping)`);
    return;
  }

  const channels = ['phone', 'whatsapp', 'in_person', 'email'];
  const sample = assignments.slice(0, INTERACTION_COUNT);

  const rows = sample.map((a, i) => {
    // Mix of outcomes so dashboard shows variety.
    const bucket = i % 5;
    let contact_result = 'contacted';
    let interest_result: string | null = null;
    let rejection_reason_id: string | null = null;
    let amount: number | null = null;

    if (bucket === 0) {
      contact_result = 'no_answer';
    } else if (bucket === 1) {
      contact_result = 'not_contacted';
    } else if (bucket === 2) {
      interest_result = 'interested';
    } else if (bucket === 3) {
      interest_result = 'not_interested';
      rejection_reason_id = reasonIds.length ? pick(reasonIds, i) : null;
    } else {
      interest_result = 'sale';
      amount = 50000 + (i % 10) * 25000;
    }

    return {
      assignment_id: a.id,
      user_id: OWNER_ID,
      campaign_id: campaignId,
      client_id: a.client_id,
      contact_result,
      interest_result,
      rejection_reason_id,
      amount,
      channel: pick(channels, i),
      notes: bucket === 4 ? 'Venta cerrada en la visita.' : null,
    };
  });

  const { error } = await db.from('interactions').insert(rows);
  if (error) throw error;
  console.log(`interactions: ${rows.length} created`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const companyId = await ensureCompany();
  const branchIds = await seedBranches(companyId);
  const clientIds = await seedClients(companyId);
  const reasonIds = await seedRejectionReasons(companyId);
  const campaignId = await ensureCampaign(companyId);
  const assignments = await seedAssignments(campaignId, clientIds, branchIds);
  await seedInteractions(campaignId, assignments, reasonIds);

  console.log('\n✅ Seed complete. Company:', companyId);
  console.log(
    `\nTo view in Sensei as Pablo (root), point his profile at this company:\n` +
      `  UPDATE public.profiles SET company_id = '${companyId}' WHERE id = '${OWNER_ID}';\n` +
      `To switch back to Proar:\n` +
      `  UPDATE public.profiles SET company_id = '7f7d3b89-f4a6-42af-ada3-e27df03f34fd' WHERE id = '${OWNER_ID}';`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
