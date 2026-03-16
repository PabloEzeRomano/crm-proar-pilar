/**
 * stores/importStore.ts — Excel import store
 *
 * Handles the in-app import flow:
 *  1. Launch document picker → user selects .xlsx file
 *  2. Read file as base64 via expo-file-system
 *  3. Parse with xlsx (SheetJS)
 *  4. Deduplicate and upsert clients + visits into Supabase
 *
 * Same deduplication rules as scripts/import-excel.ts:
 *  - Client key: LOWER(TRIM(name)) + LOWER(TRIM(address))
 *  - Visit key:  client_id + scheduled_at date (YYYY-MM-DD)
 *  - Rows with Fecha → client + visit (status: completed)
 *  - Rows without Fecha → client only
 *  - Default time 10:00 when Fecha has no time component
 */

import { create } from 'zustand';
import * as DocumentPicker from 'expo-document-picker';
import { File as FSFile } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as XLSX from 'xlsx';
import dayjs from '@/lib/dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat';

import { supabase } from '../lib/supabase';
import type { ContactInfo } from '../types';

const GAP_KEY = 'visit-gap-minutes';
const DEFAULT_GAP = 60; // minutes

dayjs.extend(customParseFormat);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportResult {
  clientsCreated: number;
  clientsSkipped: number;
  visitsCreated: number;
  visitsSkipped: number;
  errors: number;
}

export interface ImportState {
  importing: boolean;
  result: ImportResult | null;
  error: string | null;
  runImport: () => Promise<void>;
  clearResult: () => void;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface RawRow {
  Fecha?: unknown;
  RUBRO?: unknown;
  Cliente?: unknown;
  Domicilio?: unknown;
  Localidad?: unknown;
  Contacto?: unknown;
  'Tel 1'?: unknown;
  Mail?: unknown;
  'Minuta de la Reunión'?: unknown;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isString(val: unknown): val is string {
  return typeof val === 'string' && val.length > 0;
}

function str(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

function clientKey(name: string | null, address: string | null): string {
  return `${(name ?? '').toLowerCase().trim()}|${(address ?? '').toLowerCase().trim()}`;
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

function parseScheduledAt(val: unknown): string | null {
  if (!val) return null;

  let d: dayjs.Dayjs | null = null;
  let hasExplicitTime = false;

  if (val instanceof Date) {
    d = dayjs(val);
    // Check local hours/minutes — Excel date-only cells come as midnight UTC,
    // which in UTC-3 appears as 21:00 the previous day or 00:00 with artifact seconds.
    // Using local time avoids timezone shifts and ignores sub-minute artifacts.
    hasExplicitTime = d.hour() !== 0 || d.minute() !== 0;
  } else {
    const s = String(val).trim();
    for (const [fmt, hasTime] of [
      ['DD/MM/YYYY HH:mm', true],
      ['DD/MM/YYYY', false],
      ['M/D/YYYY HH:mm', true],
      ['M/D/YYYY', false],
      ['YYYY-MM-DD HH:mm', true],
      ['YYYY-MM-DD', false],
    ] as [string, boolean][]) {
      const parsed = dayjs(s, fmt, true);
      if (parsed.isValid()) {
        d = parsed;
        hasExplicitTime = hasTime;
        break;
      }
    }
  }

  if (!d || !d.isValid()) return null;
  if (!hasExplicitTime) d = d.hour(10).minute(0).second(0).millisecond(0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useImportStore = create<ImportState>()((set) => ({
  importing: false,
  result: null,
  error: null,

  clearResult: () => set({ result: null, error: null }),

  runImport: async () => {
    set({ importing: true, result: null, error: null });

    try {
      // ── 1. Pick file ────────────────────────────────────────────────────

      // Allow all files — iOS grays out .xlsx/.csv when filtering by MIME type.
      // We validate the extension ourselves after selection.
      const picked = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (picked.canceled || !picked.assets?.[0]) {
        set({ importing: false });
        return;
      }

      const asset = picked.assets[0];
      const fileName = asset.name?.toLowerCase() ?? '';
      const isCsv = fileName.endsWith('.csv');
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

      if (!isCsv && !isExcel) {
        set({ importing: false, error: 'Seleccioná un archivo Excel (.xlsx) o CSV (.csv)' });
        return;
      }

      const fileUri = asset.uri;

      // ── 2. Parse workbook ───────────────────────────────────────────────
      //
      // CSV:   read as text → XLSX.read(text, { type: 'string' })
      //        header at row 1, single sheet
      //
      // Excel: read as binary → XLSX.read(bytes, { type: 'array' })
      //        header at row 4 (range: 3), sheets 'Etapa 1' + 'Etapa 2'

      const fsFile = new FSFile(fileUri);
      let workbook: XLSX.WorkBook;
      const allRows: RawRow[] = [];

      if (isCsv) {
        const text = await fsFile.text();
        workbook = XLSX.read(text, { type: 'string', cellDates: true });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (sheet) {
          const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
          if (raw.length >= 2) {
            const headers = raw[0] as string[];
            const dataRows = raw.slice(1).map((r) => {
              const obj: RawRow = {};
              headers.forEach((h, i) => { if (h) obj[h] = (r as unknown[])[i]; });
              return obj;
            });
            allRows.push(...dataRows.filter((r) => str(r['Cliente'])));
          }
        }
      } else {
        const buffer = await fsFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        workbook = XLSX.read(bytes, { type: 'array', cellDates: true });

        const KNOWN_SHEETS = new Set(['Etapa 1', 'Etapa 2']);
        // Process named sheets first; fall back to all sheets if none match.
        const sheetsToProcess = workbook.SheetNames.some((n) => KNOWN_SHEETS.has(n))
          ? workbook.SheetNames.filter((n) => KNOWN_SHEETS.has(n))
          : workbook.SheetNames;

        for (const sheetName of sheetsToProcess) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;

          // Read all rows as arrays from row 0 to find where the header is.
          const allRaw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
            header: 1,
            range: 0,
            defval: null,
          });

          // Find the row index that contains 'Cliente' — that's the header row.
          const EXPECTED_HEADER = 'Cliente';
          const headerRowIndex = allRaw.findIndex(
            (r) => Array.isArray(r) && r.some((cell) => String(cell ?? '').trim() === EXPECTED_HEADER),
          );

          if (headerRowIndex < 0 || headerRowIndex >= allRaw.length - 1) continue;

          const headers = allRaw[headerRowIndex] as string[];
          const dataRows = allRaw.slice(headerRowIndex + 1).map((r) => {
            const obj: RawRow = {};
            headers.forEach((h, i) => { if (h) obj[h] = (r as unknown[])[i]; });
            return obj;
          });
          allRows.push(...dataRows.filter((r) => str(r['Cliente'])));
        }
      }

      // ── 4. Get current user ─────────────────────────────────────────────

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay sesión activa');

      const userId = user.id;

      // ── 5. Load existing clients ────────────────────────────────────────

      const { data: existingClients, error: clientsErr } = await supabase
        .from('clients')
        .select('id, name, address')
        .eq('owner_user_id', userId);

      if (clientsErr)
        throw new Error(`Error cargando clientes: ${clientsErr.message}`);

      const clientMap = new Map<string, string>();
      for (const c of existingClients ?? []) {
        clientMap.set(clientKey(c.name, c.address), c.id);
      }

      // ── 6. Load existing visits ─────────────────────────────────────────

      const { data: existingVisits, error: visitsErr } = await supabase
        .from('visits')
        .select('client_id, scheduled_at')
        .eq('owner_user_id', userId);

      if (visitsErr)
        throw new Error(`Error cargando visitas: ${visitsErr.message}`);

      const visitSet = new Set<string>();
      // Track latest visit time per day so imported visits are staggered by gap
      const dayLastTimeMap = new Map<string, dayjs.Dayjs>();

      for (const v of existingVisits ?? []) {
        const dateOnly = dayjs(v.scheduled_at).format('YYYY-MM-DD');
        visitSet.add(`${v.client_id}|${dateOnly}`);

        const t = dayjs(v.scheduled_at);
        const current = dayLastTimeMap.get(dateOnly);
        if (!current || t.isAfter(current)) dayLastTimeMap.set(dateOnly, t);
      }

      // Read user's gap preference (same key used by the visit form)
      const gapStr = await AsyncStorage.getItem(GAP_KEY);
      const gap = gapStr ? (parseInt(gapStr, 10) || DEFAULT_GAP) : DEFAULT_GAP;

      // ── 7. Process rows ─────────────────────────────────────────────────

      const result: ImportResult = {
        clientsCreated: 0,
        clientsSkipped: 0,
        visitsCreated: 0,
        visitsSkipped: 0,
        errors: 0,
      };

      for (const row of allRows) {
        const name = str(row['Cliente']);
        if (!name) continue;

        const address = str(row['Domicilio']);
        const key = clientKey(name, address);

        // Client
        let clientId = clientMap.get(key);

        if (!clientId) {
          const { data, error } = await supabase
            .from('clients')
            .insert({
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
              notes: null,
            })
            .select('id')
            .single();

          if (error || !data || !isString(data.id)) {
            result.errors++;
            continue;
          }

          clientId = data.id;
          clientMap.set(key, clientId);
          result.clientsCreated++;
        } else {
          result.clientsSkipped++;
        }

        if (!clientId) continue;

        // Visit (only rows with a date)
        const parsedAt = parseScheduledAt(row['Fecha']);
        if (!parsedAt) continue;

        const dateOnly = dayjs(parsedAt).format('YYYY-MM-DD');
        const visitKey = `${clientId}|${dateOnly}`;

        if (visitSet.has(visitKey)) {
          result.visitsSkipped++;
          continue;
        }

        // Assign staggered time: first visit of the day → 10:00, each next → +gap
        const lastTime = dayLastTimeMap.get(dateOnly);
        const assignedTime = lastTime
          ? lastTime.add(gap, 'minute')
          : dayjs(dateOnly).hour(10).minute(0).second(0).millisecond(0);
        const scheduledAt = assignedTime.toISOString();
        dayLastTimeMap.set(dateOnly, assignedTime);

        const isPast = dayjs(dateOnly).isBefore(dayjs().startOf('day'));
        const { error: visitErr } = await supabase.from('visits').insert({
          owner_user_id: userId,
          client_id: clientId,
          scheduled_at: scheduledAt,
          status: isPast ? 'completed' : 'pending',
          notes: str(row['Minuta de la Reunión']),
        });

        if (visitErr) {
          result.errors++;
          continue;
        }

        visitSet.add(visitKey);
        result.visitsCreated++;
      }

      set({ importing: false, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      set({ importing: false, error: message });
    }
  },
}));
