/**
 * scripts/import-excel.ts — One-time Excel import script
 *
 * Usage:
 *   npx tsx scripts/import-excel.ts             # live import
 *   npx tsx scripts/import-excel.ts --dry-run   # preview only, no writes
 *
 * Required env vars (add to .env):
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY
 *   IMPORT_USER_EMAIL
 *   IMPORT_USER_PASSWORD
 *
 * Source file: ~/Downloads/GVEGA - REPORTE DE VISITAS PROAR.xlsx
 * Sheets processed: "Etapa 1", "Etapa 2"  (Hoja3 skipped)
 * Header row: row 4 (rows 1–3 are title metadata)
 *
 * Idempotent: safe to run multiple times — existing clients and visits are
 * detected and skipped rather than duplicated.
 */

import * as path from 'node:path'
import * as os from 'node:os'
import * as XLSX from 'xlsx'
import * as dotenv from 'dotenv'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { createClient } from '@supabase/supabase-js'

dotenv.config()
dayjs.extend(customParseFormat)

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DRY_RUN = process.argv.includes('--dry-run')
const EXCEL_PATH = path.join(
  os.homedir(),
  'Downloads',
  'GVEGA - REPORTE DE VISITAS PROAR_fechas_ddmmaa.xlsx',
)
const SHEETS_TO_IMPORT = ['Etapa 1', 'Etapa 2']

// ---------------------------------------------------------------------------
// Supabase client (standalone — no Expo/SecureStore dependency)
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('✗ Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawRow {
  Fecha?: unknown
  RUBRO?: unknown
  Cliente?: unknown
  Domicilio?: unknown
  Localidad?: unknown
  Contacto?: unknown
  'Tel 1'?: unknown
  Mail?: unknown
  'Minuta de la Reunión'?: unknown
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Coerce an Excel cell value to a trimmed string, or null if empty. */
function str(val: unknown): string | null {
  if (val === undefined || val === null) return null
  const s = String(val).trim()
  return s === '' ? null : s
}

/** Dedup key: lowercased name + address pair. */
function clientKey(name: string | null, address: string | null): string {
  return `${(name ?? '').toLowerCase().trim()}|${(address ?? '').toLowerCase().trim()}`
}

/**
 * Parse an Excel date cell into an ISO 8601 UTC string.
 *
 * xlsx returns JS Date objects when `cellDates: true`. If the stored time is
 * midnight (no explicit time in the source), we default to 10:00 local time.
 */
function parseScheduledAt(val: unknown): string | null {
  if (!val) return null

  let d: dayjs.Dayjs | null = null
  let hasExplicitTime = false

  if (val instanceof Date) {
    d = dayjs(val)
    // Excel serial dates with no time portion decode to midnight UTC
    hasExplicitTime = val.getUTCHours() !== 0 || val.getUTCMinutes() !== 0
  } else {
    const s = String(val).trim()
    for (const [fmt, hasTime] of [
      ['DD/MM/YYYY HH:mm', true],
      ['DD/MM/YYYY', false],
      ['M/D/YYYY HH:mm', true],
      ['M/D/YYYY', false],
      ['YYYY-MM-DD HH:mm', true],
      ['YYYY-MM-DD', false],
    ] as [string, boolean][]) {
      const parsed = dayjs(s, fmt, true)
      if (parsed.isValid()) {
        d = parsed
        hasExplicitTime = hasTime
        break
      }
    }
  }

  if (!d || !d.isValid()) return null

  if (!hasExplicitTime) {
    d = d.hour(10).minute(0).second(0).millisecond(0)
  }

  return d.toISOString()
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (DRY_RUN) {
    console.log('╔══════════════════════════════════════════╗')
    console.log('║  DRY RUN — no data will be written       ║')
    console.log('╚══════════════════════════════════════════╝\n')
  }

  // ── 1. Auth ──────────────────────────────────────────────────────────────

  const email = process.env.IMPORT_USER_EMAIL
  const password = process.env.IMPORT_USER_PASSWORD

  if (!email || !password) {
    console.error('✗ Missing IMPORT_USER_EMAIL or IMPORT_USER_PASSWORD in .env')
    process.exit(1)
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.session) {
    console.error('✗ Authentication failed:', authError?.message ?? 'no session returned')
    process.exit(1)
  }

  const userId = authData.session.user.id
  console.log(`✓ Signed in as ${email}`)
  console.log(`  User ID: ${userId}\n`)

  // ── 2. Read Excel ─────────────────────────────────────────────────────────

  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.readFile(EXCEL_PATH, { cellDates: true })
  } catch {
    console.error(`✗ Cannot open file: ${EXCEL_PATH}`)
    console.error('  Make sure the file exists in ~/Downloads/')
    process.exit(1)
  }

  console.log(`✓ Opened: ${EXCEL_PATH}`)

  const allRows: RawRow[] = []

  for (const sheetName of SHEETS_TO_IMPORT) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) {
      console.log(`  ⚠ Sheet "${sheetName}" not found — skipping`)
      continue
    }

    // Header is row 4 → range offset 3 (0-indexed)
    const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      range: 3,
      defval: null,
    })

    if (raw.length < 2) {
      console.log(`  ⚠ Sheet "${sheetName}" has no data rows — skipping`)
      continue
    }

    const headers = raw[0] as string[]
    const dataRows = raw.slice(1).map((r) => {
      const obj: RawRow = {}
      headers.forEach((h, i) => {
        if (h) obj[h] = (r as unknown[])[i]
      })
      return obj
    })

    // Skip completely empty rows
    const nonEmpty = dataRows.filter((r) => str(r['Cliente']))
    allRows.push(...nonEmpty)
    console.log(`  ✓ Sheet "${sheetName}": ${nonEmpty.length} non-empty rows`)
  }

  console.log(`\n  Total rows to process: ${allRows.length}\n`)

  // ── 3. Load existing clients (deduplication) ───────────────────────────

  const { data: existingClients, error: clientsErr } = await supabase
    .from('clients')
    .select('id, name, address')
    .eq('owner_user_id', userId)

  if (clientsErr) {
    console.error('✗ Failed to fetch existing clients:', clientsErr.message)
    process.exit(1)
  }

  // key → client id
  const clientMap = new Map<string, string>()
  for (const c of existingClients ?? []) {
    clientMap.set(clientKey(c.name, c.address), c.id)
  }

  console.log(`  Existing clients in DB : ${clientMap.size}`)

  // ── 4. Load existing visits (deduplication) ────────────────────────────

  const { data: existingVisits, error: visitsErr } = await supabase
    .from('visits')
    .select('client_id, scheduled_at')
    .eq('owner_user_id', userId)

  if (visitsErr) {
    console.error('✗ Failed to fetch existing visits:', visitsErr.message)
    process.exit(1)
  }

  // "clientId|YYYY-MM-DD" → already exists
  const visitSet = new Set<string>()
  for (const v of existingVisits ?? []) {
    const dateOnly = dayjs(v.scheduled_at).format('YYYY-MM-DD')
    visitSet.add(`${v.client_id}|${dateOnly}`)
  }

  console.log(`  Existing visits in DB  : ${visitSet.size}\n`)

  // ── 5. Process rows ────────────────────────────────────────────────────

  let clientsCreated = 0
  let clientsSkipped = 0
  let visitsCreated = 0
  let visitsSkipped = 0
  let errors = 0

  for (const row of allRows) {
    const name = str(row['Cliente'])
    if (!name) continue

    const address = str(row['Domicilio'])
    const key = clientKey(name, address)

    // ── Client ────────────────────────────────────────────────────────────

    let clientId = clientMap.get(key)

    if (!clientId) {
      const payload = {
        owner_user_id: userId,
        name,
        industry: str(row['RUBRO']),
        address,
        city: str(row['Localidad']),
        contact_name: str(row['Contacto']),
        phone: str(row['Tel 1']),
        email: str(row['Mail']),
        notes: null as string | null,
      }

      if (DRY_RUN) {
        clientId = `dry-${key}`
        console.log(`  [DRY] + Client: ${name}`)
      } else {
        const { data, error } = await supabase
          .from('clients')
          .insert(payload)
          .select('id')
          .single()

        if (error) {
          console.error(`  ✗ Client "${name}": ${error.message}`)
          errors++
          continue
        }

        clientId = data.id
        console.log(`  + Client: ${name}`)
      }

      if (!clientId) continue

      clientMap.set(key, clientId)
      clientsCreated++
    } else {
      clientsSkipped++
    }

    // ── Visit (only for rows with a date) ─────────────────────────────────

    const scheduledAt = parseScheduledAt(row['Fecha'])
    if (!scheduledAt) continue

    const dateOnly = dayjs(scheduledAt).format('YYYY-MM-DD')
    const visitKey = `${clientId}|${dateOnly}`

    if (visitSet.has(visitKey)) {
      visitsSkipped++
      continue
    }

    const visitPayload = {
      owner_user_id: userId,
      client_id: clientId,
      scheduled_at: scheduledAt,
      status: 'completed' as const,
      notes: str(row['Minuta de la Reunión']),
    }

    if (DRY_RUN) {
      console.log(
        `  [DRY] + Visit: ${name} @ ${dayjs(scheduledAt).format('DD/MM/YYYY HH:mm')}`,
      )
    } else {
      const { error } = await supabase.from('visits').insert(visitPayload)

      if (error) {
        console.error(
          `  ✗ Visit "${name}" @ ${scheduledAt}: ${error.message}`,
        )
        errors++
        continue
      }

      console.log(`  + Visit: ${name} @ ${dayjs(scheduledAt).format('DD/MM/YYYY HH:mm')}`)
    }

    visitSet.add(visitKey)
    visitsCreated++
  }

  // ── 6. Summary ────────────────────────────────────────────────────────

  console.log('\n── Summary ───────────────────────────────────')
  console.log(`  Clients created  : ${clientsCreated}`)
  console.log(`  Clients skipped  : ${clientsSkipped}  (already in DB)`)
  console.log(`  Visits created   : ${visitsCreated}`)
  console.log(`  Visits skipped   : ${visitsSkipped}  (already in DB)`)
  if (errors > 0) console.log(`  Errors           : ${errors}`)
  if (DRY_RUN) console.log('\n  (No data was written — remove --dry-run to import)')
  console.log('──────────────────────────────────────────────')
}

main().catch((err: unknown) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
