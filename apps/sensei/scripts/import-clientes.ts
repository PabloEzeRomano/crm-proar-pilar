/**
 * scripts/import-clientes.ts — Bulk client import from SyS SA export
 *
 * Usage:
 *   npx tsx scripts/import-clientes.ts             # live import
 *   npx tsx scripts/import-clientes.ts --dry-run   # preview only, no writes
 *
 * Required env vars (in .env):
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY
 *   IMPORT_USER_EMAIL
 *   IMPORT_USER_PASSWORD
 *
 * Source file: ~/Downloads/Clientes SyS SA(2).xlsx
 *
 * Dedup key: Documento (DNI/CUIT as string) — existing clients are skipped.
 * Idempotent: safe to run multiple times.
 *
 * Column mapping:
 *   Apellido y nombre → name
 *   Documento         → cuit
 *   Domicilo          → address
 *   Localidad         → city
 *   Teléfono          → contacts[0].phone
 *   E-mail            → contacts[0].email
 *   Calificación      → commercial_classification
 */

import * as path from 'node:path';
import * as os from 'node:os';
import * as XLSX from 'xlsx';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');
const EXCEL_PATH = path.join(
  os.homedir(),
  'Downloads',
  'Clientes SyS SA(2).xlsx'
);
const BATCH_SIZE = 100;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('✗ Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ContactInfo {
  name?: string;
  phone?: string;
  email?: string;
}

interface RawRow {
  'Apellido y nombre'?: unknown;
  Documento?: unknown;
  Domicilo?: unknown;
  Localidad?: unknown;
  Teléfono?: unknown;
  'E-mail'?: unknown;
  Calificación?: unknown;
  [key: string]: unknown;
}

function str(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === '' || s.toLowerCase() === 'nan' ? null : s;
}

/** Convert Excel phone float (e.g. 1.130312e+09) to digit string. */
function phone(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  const n = Number(val);
  if (isNaN(n) || n === 0) return null;
  return Math.round(n).toString();
}

/** Normalize Documento to string without decimals. */
function documento(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim().replace(/\.0$/, '');
  return s === '' ? null : s;
}

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no writes\n' : '🚀 LIVE RUN\n');

  // ── Auth ──────────────────────────────────────────────────────────────────

  const email = process.env.IMPORT_USER_EMAIL;
  const password = process.env.IMPORT_USER_PASSWORD;

  if (!email || !password) {
    console.error('✗ Missing IMPORT_USER_EMAIL or IMPORT_USER_PASSWORD in .env');
    process.exit(1);
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !authData.session) {
    console.error('✗ Auth failed:', authError?.message ?? 'no session');
    process.exit(1);
  }

  const userId = authData.session.user.id;
  console.log(`✓ Signed in as ${email}`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single();

  if (!profile?.company_id) {
    console.error('✗ No company_id on profile — make sure user belongs to a company.');
    process.exit(1);
  }

  const companyId = profile.company_id as string;
  console.log(`  company_id: ${companyId}\n`);

  // ── Read Excel ────────────────────────────────────────────────────────────

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  } catch {
    console.error(`✗ Cannot open: ${EXCEL_PATH}`);
    process.exit(1);
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null });
  console.log(`✓ Read ${rows.length} rows from Excel\n`);

  // ── Fetch existing CUITs ──────────────────────────────────────────────────

  const { data: existing } = await supabase
    .from('clients')
    .select('cuit')
    .eq('company_id', companyId);

  const existingCuits = new Set((existing ?? []).map((r) => r.cuit).filter(Boolean));
  console.log(`  Existing clients in DB: ${existingCuits.size}`);

  // ── Build records ─────────────────────────────────────────────────────────

  const toInsert: object[] = [];
  const skipped: string[] = [];
  const noDoc: number[] = [];

  for (const row of rows) {
    const name = str(row['Apellido y nombre']);
    if (!name) continue;

    const cuit = documento(row['Documento']);
    if (!cuit) {
      noDoc.push(toInsert.length + skipped.length + 1);
      continue;
    }

    if (existingCuits.has(cuit)) {
      skipped.push(cuit);
      continue;
    }

    const contacts: ContactInfo[] = [];
    const ph = phone(row['Teléfono']);
    const em = str(row['E-mail'])?.toLowerCase() ?? null;
    if (ph || em) contacts.push({ phone: ph ?? undefined, email: em ?? undefined });

    const calificacion = str(row['Calificación']);

    toInsert.push({
      owner_user_id: userId,
      company_id: companyId,
      name,
      cuit,
      address: str(row['Domicilo']),
      city: str(row['Localidad']),
      contacts,
      commercial_classification:
        calificacion && calificacion !== 'Sin datos' ? calificacion : null,
      notes: null,
    });
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n── Import summary ────────────────────────────`);
  console.log(`  Total Excel rows:       ${rows.length}`);
  console.log(`  No documento (skipped): ${noDoc.length}`);
  console.log(`  Already in DB (skip):   ${skipped.length}`);
  console.log(`  To import:              ${toInsert.length}`);
  console.log(`──────────────────────────────────────────────\n`);

  if (DRY_RUN || toInsert.length === 0) {
    if (toInsert.length > 0) {
      console.log('Sample (first 3):');
      toInsert.slice(0, 3).forEach((r) => console.log(' ', JSON.stringify(r)));
    }
    console.log(DRY_RUN ? '\n✓ Dry run complete — no writes made.' : '✓ Nothing to import.');
    return;
  }

  // ── Insert in batches ─────────────────────────────────────────────────────

  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('clients').insert(batch);
    if (error) {
      console.error(`  ✗ Batch ${i / BATCH_SIZE + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
      process.stdout.write(`\r  Inserted ${inserted}/${toInsert.length}...`);
    }
  }

  console.log(`\n\n✓ Done — ${inserted} imported, ${errors} errors, ${skipped.length} skipped.`);
}

main().catch((e) => {
  console.error('✗ Fatal:', e);
  process.exit(1);
});
