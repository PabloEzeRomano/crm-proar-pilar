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
const GAP_ARG = process.argv.find((a) => a.startsWith('--gap='))
const GAP_MINUTES = GAP_ARG ? parseInt(GAP_ARG.split('=')[1], 10) : 60
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

interface ContactInfo {
  name?: string
  phone?: string
  email?: string
}

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

/** Parse a phone cell segment into { name?, phone }.
 *  Handles patterns like: "Name number", "number (Name)", "cel. Name number" */
function parsePhoneSegment(seg: string): { name?: string; phone: string } | null {
  seg = seg.trim()
  if (!seg || seg === '-') return null

  let name: string | undefined

  // Extract (label) in parens — only if contains letters (not area codes like (011))
  seg = seg.replace(/\(([^)]+)\)/g, (match, inner) => {
    const trimmed = inner.trim()
    if (/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(trimmed)) {
      const candidate = trimmed.replace(/^(cel|tel|int)\b\.?\s*/i, '').trim()
      // Skip if it's "int. NNN" style extension markers
      if (candidate && !/^\d+$/.test(candidate) && !name) name = candidate
      return ''
    }
    return match // keep area code parens like (011)
  })

  // Strip common prefixes
  seg = seg.replace(/^\s*(cel\.?|tel\.?|teléfono\.?)\s*/i, '')

  // Extract leading name (letters before first digit/+ group)
  const leadingName = seg.match(/^([a-zA-ZáéíóúñÁÉÍÓÚÑ][a-zA-ZáéíóúñÁÉÍÓÚÑ\s.]+?)\s+(?=[\d+(])/)
  if (leadingName) {
    const candidate = leadingName[1].trim().replace(/\s*(cel\.?|tel\.?)$/i, '')
    const isNoise = /^(cel|tel|int|empresa|planta|portería|y)\b/i.test(candidate)
    if (!isNoise && candidate.length > 1) {
      if (!name) name = candidate
    }
    seg = seg.slice(leadingName[0].length)
  }

  // Strip trailing "y NNN" style connectors that bleed into phone string
  seg = seg.replace(/\s+y\s+[\d-]+.*$/i, '').trim()

  // Remove any remaining letters (but preserve + and parens for area codes)
  const phone = seg
    .replace(/[a-zA-ZáéíóúñÁÉÍÓÚÑ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.\s]+$/, '')

  if (!phone || phone.replace(/\D/g, '').length < 6) return null
  return { name: name || undefined, phone }
}

/** Parse a Tel 1 cell → array of { name?, phone } contacts */
function parsePhoneCell(raw: unknown): { name?: string; phone: string }[] {
  if (!raw) return []
  const s = String(raw).trim()
  if (!s || s === '-') return []
  const segments = s.split(/\/\/|[\n\r]+|\//).map((x) => x.trim()).filter(Boolean)
  return segments.flatMap((seg) => {
    const r = parsePhoneSegment(seg)
    return r ? [r] : []
  })
}

/** Parse a Mail cell → array of { name?, email } contacts */
function parseEmailCell(raw: unknown): { name?: string; email: string }[] {
  if (!raw) return []
  const s = String(raw).trim()
  if (!s || s === '-') return []
  const emailRe = /[\w.+%-]+@[\w.-]+\.[a-zA-Z]{2,}/g
  const results: { name?: string; email: string }[] = []
  let m: RegExpExecArray | null
  while ((m = emailRe.exec(s)) !== null) {
    const email = m[0]
    const before = s.slice(0, m.index)
    const parts = before.split(/[\/\n,]/)
    const lastPart = (parts[parts.length - 1] ?? '').replace(/<.*$/, '').replace(/[=>\-]+$/, '').replace(/\(/, '').trim()
    // Discard if the "name" is itself an email address
    const name = lastPart.length > 1 && lastPart.length < 50 &&
      /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(lastPart) && !lastPart.includes('@')
      ? lastPart : undefined
    results.push({ name, email })
  }
  return results
}

/** Build ContactInfo[] from a single Excel row's Contacto / Tel 1 / Mail fields */
function parseContactsFromRow(
  contacto: string | null,
  tel1: unknown,
  mail: unknown,
): ContactInfo[] {
  const phones = parsePhoneCell(tel1)
  const emails = parseEmailCell(mail)
  const contacts: ContactInfo[] = []

  // Merge phones and emails by matching on name when possible
  const usedEmailIdxs = new Set<number>()

  for (const p of phones) {
    // Try to find a matching email by name
    let matchedEmail: string | undefined
    if (p.name) {
      const idx = emails.findIndex(
        (e, i) =>
          !usedEmailIdxs.has(i) &&
          e.name &&
          e.name.toLowerCase().includes(p.name!.toLowerCase().split(' ')[0]),
      )
      if (idx !== -1) {
        matchedEmail = emails[idx].email
        usedEmailIdxs.add(idx)
      }
    }
    contacts.push({ name: p.name, phone: p.phone, email: matchedEmail })
  }

  // Add remaining unmatched emails
  for (let i = 0; i < emails.length; i++) {
    if (!usedEmailIdxs.has(i)) {
      contacts.push({ name: emails[i].name, email: emails[i].email })
    }
  }

  // If nothing was extracted but we have a Contacto name, create a name-only entry
  if (contacts.length === 0 && contacto) {
    contacts.push({ name: contacto })
  }

  // If we have contacts but none has a name, assign Contacto to first entry
  if (contacts.length > 0 && !contacts[0].name && contacto) {
    contacts[0] = { ...contacts[0], name: contacto }
  }

  return contacts
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
    // Check local hours/minutes — Excel date-only cells come with artifact seconds
    // (e.g. 00:00:48 local). Using local time correctly treats these as date-only.
    hasExplicitTime = d.hour() !== 0 || d.minute() !== 0
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
  // Track latest visit time per day for gap-based staggering
  const dayLastTimeMap = new Map<string, dayjs.Dayjs>()

  for (const v of existingVisits ?? []) {
    const dateOnly = dayjs(v.scheduled_at).format('YYYY-MM-DD')
    visitSet.add(`${v.client_id}|${dateOnly}`)

    const t = dayjs(v.scheduled_at)
    const current = dayLastTimeMap.get(dateOnly)
    if (!current || t.isAfter(current)) dayLastTimeMap.set(dateOnly, t)
  }

  console.log(`  Existing visits in DB  : ${visitSet.size}`)
  console.log(`  Visit gap              : ${GAP_MINUTES} min\n`)

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
        contacts: parseContactsFromRow(
          str(row['Contacto']),
          row['Tel 1'],
          row['Mail'],
        ),
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

    const parsedAt = parseScheduledAt(row['Fecha'])
    if (!parsedAt) continue

    const dateOnly = dayjs(parsedAt).format('YYYY-MM-DD')
    const visitKey = `${clientId}|${dateOnly}`

    if (visitSet.has(visitKey)) {
      visitsSkipped++
      continue
    }

    // Stagger visits within the same day by gap
    const lastTime = dayLastTimeMap.get(dateOnly)
    const assignedTime = lastTime
      ? lastTime.add(GAP_MINUTES, 'minute')
      : dayjs(dateOnly).hour(10).minute(0).second(0).millisecond(0)
    const scheduledAt = assignedTime.toISOString()
    dayLastTimeMap.set(dateOnly, assignedTime)

    const visitPayload = {
      owner_user_id: userId,
      client_id: clientId,
      scheduled_at: scheduledAt,
      status: dayjs(dateOnly).isBefore(dayjs().startOf('day')) ? 'completed' : 'pending',
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
