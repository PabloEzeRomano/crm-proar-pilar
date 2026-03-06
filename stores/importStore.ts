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
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import { supabase } from '../lib/supabase';

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

function parseScheduledAt(val: unknown): string | null {
  if (!val) return null;

  let d: dayjs.Dayjs | null = null;
  let hasExplicitTime = false;

  if (val instanceof Date) {
    d = dayjs(val);
    hasExplicitTime = val.getUTCHours() !== 0 || val.getUTCMinutes() !== 0;
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
      for (const v of existingVisits ?? []) {
        const dateOnly = dayjs(v.scheduled_at).format('YYYY-MM-DD');
        visitSet.add(`${v.client_id}|${dateOnly}`);
      }

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
              contact_name: str(row['Contacto']),
              phone: str(row['Tel 1']),
              email: str(row['Mail']),
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
        const scheduledAt = parseScheduledAt(row['Fecha']);
        if (!scheduledAt) continue;

        const dateOnly = dayjs(scheduledAt).format('YYYY-MM-DD');
        const visitKey = `${clientId}|${dateOnly}`;

        if (visitSet.has(visitKey)) {
          result.visitsSkipped++;
          continue;
        }

        const isPast = dayjs(scheduledAt).isBefore(dayjs());
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
