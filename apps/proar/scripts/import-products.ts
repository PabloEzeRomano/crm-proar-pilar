/**
 * scripts/import-products.ts — Bulk import the product catalog from
 * Germán's "Costos PL" spreadsheet.
 *
 * Usage:
 *   npx tsx scripts/import-products.ts             # live import
 *   npx tsx scripts/import-products.ts --dry-run   # preview only
 *
 * Required env vars (add to .env):
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY
 *   IMPORT_USER_EMAIL      — must be admin/root/product_manager (RLS write access)
 *   IMPORT_USER_PASSWORD
 *
 * Source file: ~/Downloads/Proyectos - PROAR/Libro1.xlsm - Costos PL.csv
 * Header row: row 3 (rows 1–2 are title/column-number metadata, row 4 is junk)
 *
 * Each data row is one product + one presentation (e.g. "PL 101 N" /
 * "Bidones 20 lt" — the same product code repeats across multiple Envase
 * rows for its different packaging presentations). The row has up to 12
 * dated "CostoPL" columns; the spreadsheet's "costo" is what the vendedor
 * sees as the base price before margin (price_usd), NOT a separate cost
 * field. This script takes the rightmost column with a valid USD value as
 * the current price_usd. Rows where any CostoPL column says "DISCONTINUADO"
 * are skipped entirely.
 *
 * Idempotent: matches existing products by lower(trim(code)) (falling back
 * to lower(trim(name))) and existing presentations by lower(trim(label))
 * within that product, so re-running just updates price_usd in place.
 */

import * as path from 'node:path';
import * as os from 'node:os';
import * as XLSX from 'xlsx';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DRY_RUN = process.argv.includes('--dry-run');
const CSV_PATH =
  process.env.PRODUCT_CATALOG_CSV_PATH ??
  path.join(
    os.homedir(),
    'Downloads',
    'Proyectos - PROAR',
    'Libro1.xlsm - Costos PL.csv'
  );

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '✗ Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------------------------------------------------------------------------
// Row parsing helpers
// ---------------------------------------------------------------------------

const DATA_HEADER_ROW = 2; // 0-indexed row 3: ID_Prod, Producto PROAR, ...
const DATA_START_ROW = 4; // 0-indexed row 5: first real data row
const COSTOPL_FIRST_COL = 6; // 0-indexed col 7: first "CostoPL <date>" column
const COSTOPL_LAST_COL = 17; // 0-indexed col 18: last "CostoPL <date>" column

type PriceResult =
  | { kind: 'value'; price: number }
  | { kind: 'empty' }
  | { kind: 'discontinued' };

function parsePriceCell(raw: unknown): PriceResult {
  const s = String(raw ?? '').trim();
  if (!s) return { kind: 'empty' };
  if (/discontinuado/i.test(s)) return { kind: 'discontinued' };
  if (/sin precio|ver costo/i.test(s)) return { kind: 'empty' };
  const m = s.match(/USD\s*([\d.]+|-)/i);
  if (!m || m[1] === '-') return { kind: 'empty' };
  const n = parseFloat(m[1]);
  return isNaN(n) ? { kind: 'empty' } : { kind: 'value', price: n };
}

/**
 * Scans the row's CostoPL columns right-to-left. Returns the most recent
 * valid price, or 'discontinued' if any column in the row says so, or null
 * if no column has a usable value yet.
 */
function resolveLatestPrice(row: unknown[]): number | 'discontinued' | null {
  let sawDiscontinued = false;
  for (let i = COSTOPL_LAST_COL; i >= COSTOPL_FIRST_COL; i--) {
    const result = parsePriceCell(row[i]);
    if (result.kind === 'discontinued') sawDiscontinued = true;
    if (result.kind === 'value') return result.price;
  }
  return sawDiscontinued ? 'discontinued' : null;
}

function parsePresentationQty(raw: unknown): {
  quantity: number | null;
  unit: string;
} {
  const s = String(raw ?? '').trim();
  if (!s || /^granel$/i.test(s)) return { quantity: null, unit: 'kg' };
  // Values like "1,300 kg" use comma as a thousands separator.
  const m = s.match(/^([\d,.]+)\s*(\S+)?/);
  if (!m) return { quantity: null, unit: 'kg' };
  const qty = parseFloat(m[1].replace(/,/g, ''));
  return { quantity: isNaN(qty) ? null : qty, unit: m[2] || 'kg' };
}

function inferProductType(code: string): 'commodity' | 'formulated' {
  return /^PL\s/i.test(code) ? 'formulated' : 'commodity';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (DRY_RUN) {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║  DRY RUN — no data will be written       ║');
    console.log('╚══════════════════════════════════════════╝\n');
  }

  // ── 1. Auth ──────────────────────────────────────────────────────────────

  const email = process.env.IMPORT_USER_EMAIL;
  const password = process.env.IMPORT_USER_PASSWORD;

  if (!email || !password) {
    console.error(
      '✗ Missing IMPORT_USER_EMAIL or IMPORT_USER_PASSWORD in .env'
    );
    process.exit(1);
  }

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (authError || !authData.session) {
    console.error(
      '✗ Authentication failed:',
      authError?.message ?? 'no session returned'
    );
    process.exit(1);
  }
  console.log(`✓ Signed in as ${email}\n`);

  // ── 2. Read CSV ──────────────────────────────────────────────────────────

  let rows: unknown[][];
  try {
    const workbook = XLSX.readFile(CSV_PATH, { raw: true, codepage: 65001 });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
    });
  } catch {
    console.error(`✗ Cannot open file: ${CSV_PATH}`);
    process.exit(1);
  }

  const dataRows = rows.slice(DATA_START_ROW);
  console.log(`✓ Opened: ${CSV_PATH}`);
  console.log(`  Header: ${rows[DATA_HEADER_ROW]?.slice(0, 6).join(' | ')}`);
  console.log(`  Data rows: ${dataRows.length}\n`);

  // ── 3. Fetch existing products + presentations ─────────────────────────

  const { data: existingProducts, error: prodFetchErr } = await supabase
    .from('products')
    .select('id, name, code, presentations:product_presentations(id, label)');

  if (prodFetchErr) {
    console.error('✗ Failed to fetch existing products:', prodFetchErr.message);
    process.exit(1);
  }

  type ExistingProduct = {
    id: string;
    name: string;
    code: string | null;
    presentations: { id: string; label: string }[];
  };
  const products = (existingProducts ?? []) as ExistingProduct[];

  const normalize = (s: string) => s.trim().toLowerCase();
  const byCode = new Map(
    products.filter((p) => p.code).map((p) => [normalize(p.code!), p])
  );
  const byName = new Map(products.map((p) => [normalize(p.name), p]));

  // ── 4. Process rows ──────────────────────────────────────────────────────

  let createdProducts = 0;
  let createdPresentations = 0;
  let updatedPrices = 0;
  let skippedDiscontinued = 0;
  let skippedBlank = 0;

  for (const [i, row] of dataRows.entries()) {
    const rowNum = DATA_START_ROW + i + 1;
    const code = String(row[1] ?? '').trim();
    const name = String(row[2] ?? '').trim() || code;
    const envase = String(row[3] ?? '').trim();
    const presentacion = row[4];

    if (!code || !envase) {
      skippedBlank++;
      continue;
    }

    const priceResult = resolveLatestPrice(row);
    if (priceResult === 'discontinued') {
      console.log(`  ⊘ Row ${rowNum}: ${code} / ${envase} — DISCONTINUADO, omitido`);
      skippedDiscontinued++;
      continue;
    }
    const price_usd = priceResult; // number | null

    let product = byCode.get(normalize(code)) ?? byName.get(normalize(name));

    if (!product) {
      const type = inferProductType(code);
      console.log(`  + Nuevo producto: ${code} (${name}) [${type}]`);
      if (!DRY_RUN) {
        const { data: created, error } = await supabase
          .from('products')
          .insert({ name, code, type })
          .select('id, name, code')
          .single();
        if (error) {
          console.error(`    ✗ Failed to create product: ${error.message}`);
          continue;
        }
        product = { ...created, presentations: [] } as ExistingProduct;
        byCode.set(normalize(code), product);
        byName.set(normalize(name), product);
      } else {
        product = {
          id: 'dry-run',
          name,
          code,
          presentations: [],
        } as ExistingProduct;
      }
      createdProducts++;
    }

    const { quantity, unit } = parsePresentationQty(presentacion);
    const existingPres = product.presentations.find(
      (p) => normalize(p.label) === normalize(envase)
    );

    if (!existingPres) {
      console.log(
        `    + Nueva presentación: ${envase} (price_usd=${price_usd ?? '0 — sin dato, ajustar manualmente'})`
      );
      if (!DRY_RUN && product.id !== 'dry-run') {
        const { data: createdPres, error } = await supabase
          .from('product_presentations')
          .insert({
            product_id: product.id,
            label: envase,
            unit,
            quantity,
            price_usd: price_usd ?? 0,
          })
          .select('id, label')
          .single();
        if (error) {
          console.error(`    ✗ Failed to create presentation: ${error.message}`);
          continue;
        }
        product.presentations.push(createdPres as { id: string; label: string });
      }
      createdPresentations++;
    } else if (price_usd != null) {
      console.log(`    ~ ${code} / ${envase}: price_usd → ${price_usd}`);
      if (!DRY_RUN) {
        const { error } = await supabase
          .from('product_presentations')
          .update({ price_usd })
          .eq('id', existingPres.id);
        if (error) {
          console.error(`    ✗ Failed to update price: ${error.message}`);
          continue;
        }
      }
      updatedPrices++;
    }
  }

  // ── 5. Summary ───────────────────────────────────────────────────────────

  console.log('\n── Resumen ──────────────────────────────');
  console.log(`Productos nuevos:        ${createdProducts}`);
  console.log(`Presentaciones nuevas:   ${createdPresentations}`);
  console.log(`Precios actualizados:    ${updatedPrices}`);
  console.log(`Omitidos (discontinuado): ${skippedDiscontinued}`);
  console.log(`Omitidos (fila vacía):    ${skippedBlank}`);
  if (DRY_RUN) console.log('\n(dry run — nada se escribió)');
}

main().catch((err) => {
  console.error('✗ Unexpected error:', err);
  process.exit(1);
});
