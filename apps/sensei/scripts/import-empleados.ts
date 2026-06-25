/**
 * scripts/import-empleados.ts — Import branches + employee roster from SyS SA export
 *
 * Usage:
 *   npx tsx scripts/import-empleados.ts             # live import (branches only)
 *   npx tsx scripts/import-empleados.ts --dry-run   # preview only, no writes
 *
 * Required env vars (in .env):
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY
 *   IMPORT_USER_EMAIL
 *   IMPORT_USER_PASSWORD
 *
 * Source file: ~/Downloads/Listado de Empleados SyS SA(1).xlsx
 *
 * What this script does:
 *   1. Creates missing branches (Unidad De Negocio → branches table).
 *   2. Prints an employee roster grouped by branch.
 *      Employees cannot be auto-created — they need email addresses.
 *      Invite them from the app: Settings → Team → Invite.
 *
 * Dedup key for branches: name (case-insensitive). Idempotent.
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
  'Listado de Empleados SyS SA(1).xlsx'
);

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('✗ Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface RawRow {
  Nombre?: unknown;
  DNI?: unknown;
  'Cta/Cliente'?: unknown;
  'Unidad De Negocio'?: unknown;
  Comprador?: unknown;
  Vendedor?: unknown;
  Ingreso?: unknown;
  Egreso?: unknown;
  Usuario?: unknown;
  Nivel?: unknown;
  [key: string]: unknown;
}

function str(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === '' || s.toLowerCase() === 'nan' ? null : s;
}

function num(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  const n = Number(val);
  return isNaN(n) ? null : Math.round(n);
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
    console.error('✗ No company_id on profile.');
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
  console.log(`✓ Read ${rows.length} employees from Excel\n`);

  // ── Extract branches ──────────────────────────────────────────────────────

  const branchNamesFromExcel = [
    ...new Set(
      rows
        .map((r) => str(r['Unidad De Negocio']))
        .filter((b): b is string => b !== null)
    ),
  ].sort();

  console.log(`  Branches in Excel (${branchNamesFromExcel.length}):`);
  branchNamesFromExcel.forEach((b) => console.log(`    - ${b}`));

  // ── Fetch existing branches ───────────────────────────────────────────────

  const { data: existingBranches } = await supabase
    .from('branches')
    .select('id, name')
    .eq('company_id', companyId);

  const existingNames = new Set(
    (existingBranches ?? []).map((b) => b.name.toLowerCase().trim())
  );

  const toCreate = branchNamesFromExcel.filter(
    (b) => !existingNames.has(b.toLowerCase().trim())
  );

  console.log(`\n  Already in DB: ${(existingBranches ?? []).length} branches`);
  console.log(`  To create:     ${toCreate.length} branches`);

  if (toCreate.length > 0) {
    console.log('\n  New branches:');
    toCreate.forEach((b) => console.log(`    + ${b}`));
  }

  // ── Create branches ───────────────────────────────────────────────────────

  let createdCount = 0;

  if (!DRY_RUN && toCreate.length > 0) {
    console.log('\n  Creating branches...');
    for (const name of toCreate) {
      const { error } = await supabase
        .from('branches')
        .insert({ company_id: companyId, name });
      if (error) {
        console.error(`  ✗ Failed to create "${name}":`, error.message);
      } else {
        createdCount++;
        console.log(`  ✓ Created: ${name}`);
      }
    }
  }

  // ── Employee roster by branch ─────────────────────────────────────────────

  const byBranch = new Map<string, RawRow[]>();
  for (const row of rows) {
    const branch = str(row['Unidad De Negocio']) ?? '(sin sucursal)';
    if (!byBranch.has(branch)) byBranch.set(branch, []);
    byBranch.get(branch)!.push(row);
  }

  console.log('\n\n══ Employee roster (invite manually via Settings → Team) ══\n');

  for (const [branch, employees] of [...byBranch.entries()].sort()) {
    console.log(`▶ ${branch} (${employees.length} employees)`);
    for (const e of employees) {
      const name = str(e['Nombre']) ?? '(sin nombre)';
      const dni = num(e['DNI']);
      const vendedor = num(e['Vendedor']);
      const usuario = str(e['Usuario']);
      const cta = str(e['Cta/Cliente']);
      console.log(
        `  • ${name}` +
        (dni ? ` | DNI: ${dni}` : '') +
        (vendedor ? ` | Cod.Vendedor: ${vendedor}` : '') +
        (cta ? ` | Cta: ${cta}` : '') +
        (usuario ? ` | Usuario: ${usuario}` : '')
      );
    }
    console.log();
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log('══ Summary ══════════════════════════════════\n');
  console.log(`  Total employees:  ${rows.length}`);
  console.log(`  Total branches:   ${branchNamesFromExcel.length}`);
  if (DRY_RUN) {
    console.log(`  Branches to create (dry run): ${toCreate.length}`);
    console.log('\n✓ Dry run complete — no writes made.');
  } else {
    console.log(`  Branches created: ${createdCount}`);
    console.log('\n✓ Done. Invite employees via Settings → Team → Invite in the app.');
    console.log('  Assign each employee their branch and vendedor code after inviting.');
  }
}

main().catch((e) => {
  console.error('✗ Fatal:', e);
  process.exit(1);
});
