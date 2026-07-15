/**
 * Import Wizard — prospectos from Excel/CSV
 * Steps: upload → [sheet] → map columns → preview → importing → done
 * The sheet step only appears when the workbook has more than one sheet.
 */

import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
  shadows,
} from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useProspectsStore } from '@/stores/prospectsStore';
import {
  STAGE_LABELS,
  PRODUCT_LABELS,
  PIPELINE_STAGES,
  PRODUCTS,
  type ContactInfo,
  type ProspectProduct,
  type ProspectStage,
} from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'sheet' | 'map' | 'preview' | 'importing' | 'done';

interface ParsedSheet {
  headers: string[];
  rows: Record<string, unknown>[];
}

interface ProspectMapping {
  name: string | null;
  contact_columns: string[];   // multi-select: any phone/email/name cols
  industry: string | null;
  address: string | null;
  zone: string | null;
  cuit: string | null;
  product: string | null;
  stage: string | null;
  notes: string | null;
  next_follow_up: string | null;
}

interface PreviewRow {
  name: string;
  contact_raws: Record<string, string | null>;
  industry: string | null;
  address: string | null;
  zone: string | null;
  cuit: string | null;
  product: string | null;
  stage: string | null;
  notes: string | null;
  next_follow_up: string | null;
}

// ── Field config (single-column pickers only) ─────────────────────────────────

const FIELDS: { key: keyof Omit<ProspectMapping, 'contact_columns'>; label: string; required?: boolean }[] = [
  { key: 'name',           label: 'Cliente / Prospecto (empresa)', required: true },
  { key: 'industry',       label: 'Rubro' },
  { key: 'address',        label: 'Dirección' },
  { key: 'zone',           label: 'Zona' },
  { key: 'cuit',           label: 'CUIT' },
  { key: 'product',        label: 'Producto (crm/miturno/qrtify)' },
  { key: 'stage',          label: 'Etapa' },
  { key: 'notes',          label: 'Notas' },
  { key: 'next_follow_up', label: 'Próximo seguimiento (fecha)' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function str(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null;
  return String(val).trim() || null;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseDate(val: unknown): string | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  if (/^\d{4,5}$/.test(s)) {
    const d = XLSX.SSF.parse_date_code(Number(s));
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d)).toISOString();
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();
  return null;
}

function parseProduct(val: unknown): ProspectProduct | null {
  if (!val) return null;
  const n = normalize(String(val));
  if (n.includes('crm')) return 'crm';
  if (n.includes('miturno') || n.includes('turno')) return 'miturno';
  if (n.includes('qr') || n.includes('qrtify')) return 'qrtify';
  return null;
}

function parseStage(val: unknown): ProspectStage | null {
  if (!val) return null;
  const n = normalize(String(val));
  if (n.includes('lead')) return 'lead';
  if (n.includes('contact')) return 'contacted';
  if (n.includes('propuest') || n.includes('proposal')) return 'proposal';
  if (n.includes('negoc')) return 'negotiation';
  if (n.includes('ganad') || n.includes('won') || n.includes('cerrad')) return 'won';
  if (n.includes('perdid') || n.includes('lost')) return 'lost';
  return null;
}

// ── Contact parsing ───────────────────────────────────────────────────────────

type ContactColType = 'phone' | 'email' | 'name';

function detectColumnType(colName: string): ContactColType | null {
  const n = normalize(colName);
  if (n.includes('tel') || n.includes('cel') || n.includes('phone')) return 'phone';
  if (n.includes('mail') || n.includes('email')) return 'email';
  if (n.includes('contacto') || n.includes('contact') || n.includes('nombre')) return 'name';
  return null;
}

function parsePhoneChunk(chunk: string): { name?: string; phone?: string } {
  // Match phone: starts with + or digit, at least 5 chars of digits/spaces/dots/parens/dashes
  const phoneMatch = chunk.match(/([\+\d][\d\s\.()\-]{4,})/);
  const phone = phoneMatch ? phoneMatch[1].replace(/[\s.()\-]/g, '') : undefined;

  // Remove phone + type labels → remaining text = name
  let nameStr = chunk;
  if (phoneMatch) nameStr = nameStr.replace(phoneMatch[0], '');
  nameStr = nameStr.replace(/\b(CEL|TEL|cel|tel)\b\.?/gi, '').replace(/[()]/g, '').trim();

  const result: { name?: string; phone?: string } = {};
  if (nameStr) result.name = nameStr;
  if (phone) result.phone = phone;
  return result;
}

function parsePhoneCell(cell: string): Array<{ name?: string; phone?: string }> {
  if (!cell.trim()) return [];
  return cell
    .split(/[\/\t]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parsePhoneChunk)
    .filter((c) => c.name || c.phone);
}

function parseEmailCell(cell: string): string[] {
  if (!cell.trim()) return [];
  return cell
    .split(/[\/,;]/)
    .map((s) => s.trim())
    .filter((s) => s.includes('@'));
}

function buildContacts(
  contactRaws: Record<string, string | null>,
  contactColumns: string[],
): ContactInfo[] {
  const phoneContacts: Array<{ name?: string; phone?: string }> = [];
  const emails: string[] = [];
  let nameValue: string | undefined;

  for (const col of contactColumns) {
    const raw = contactRaws[col];
    if (!raw) continue;
    const type = detectColumnType(col);
    if (type === 'phone') {
      phoneContacts.push(...parsePhoneCell(raw));
    } else if (type === 'email') {
      emails.push(...parseEmailCell(raw));
    } else if (type === 'name' && !nameValue) {
      nameValue = raw;
    }
  }

  // Merge: phone contacts are base, assign emails by position
  const contacts: ContactInfo[] = phoneContacts.map((c, i) => ({
    ...c,
    ...(emails[i] ? { email: emails[i] } : {}),
  }));

  // Remaining emails (more emails than phone contacts) → extra entries
  for (let i = phoneContacts.length; i < emails.length; i++) {
    contacts.push({ email: emails[i] });
  }

  // Assign name to first contact if it has none
  if (nameValue) {
    if (contacts.length > 0 && !contacts[0].name) {
      contacts[0] = { ...contacts[0], name: nameValue };
    } else if (contacts.length === 0) {
      contacts.push({ name: nameValue });
    }
  }

  return contacts;
}

// ── Auto-detect ───────────────────────────────────────────────────────────────

function autoDetect(headers: string[]): ProspectMapping {
  const m: ProspectMapping = {
    name: null, contact_columns: [],
    industry: null, address: null, zone: null, cuit: null,
    product: null, stage: null, notes: null, next_follow_up: null,
  };
  for (const h of headers) {
    const n = normalize(h);
    if (!m.name && (n.includes('cliente') || n.includes('prospecto') || n === 'name' || n.includes('nombre'))) {
      m.name = h;
    } else if (detectColumnType(h) !== null) {
      m.contact_columns.push(h);
    } else if (!m.industry && (n.includes('rubro') || n.includes('industria') || n.includes('sector'))) {
      m.industry = h;
    } else if (!m.address && (n.includes('direcc') || n.includes('domicilio') || n.includes('address'))) {
      m.address = h;
    } else if (!m.zone && (n === 'zona' || n === 'zone' || n.includes('zona') || n.includes('region'))) {
      m.zone = h;
    } else if (!m.cuit && n.includes('cuit')) {
      m.cuit = h;
    } else if (!m.product && (n.includes('product') || n.includes('app'))) {
      m.product = h;
    } else if (!m.stage && (n.includes('etapa') || n.includes('stage') || n.includes('estado'))) {
      m.stage = h;
    } else if (!m.notes && (n.includes('nota') || n.includes('note') || n.includes('obs') || n.includes('minuta'))) {
      m.notes = h;
    } else if (!m.next_follow_up && (n.includes('follow') || n.includes('seguimiento') || n.includes('fecha'))) {
      m.next_follow_up = h;
    }
  }
  return m;
}

// ── Column picker (single) ────────────────────────────────────────────────────

function ColumnPicker({
  label,
  required,
  headers,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  headers: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<View>(null);
  const [btnY, setBtnY] = useState(0);

  function handleOpen() {
    btnRef.current?.measureInWindow((_x, y, _w, h) => {
      setBtnY(y + h + 4);
      setOpen(true);
    });
  }

  return (
    <View style={styles.pickerRow}>
      <Text style={styles.pickerLabel}>
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>
      <Pressable
        ref={btnRef}
        style={({ pressed }) => [styles.pickerBtn, pressed && styles.pickerBtnPressed]}
        onPress={handleOpen}
      >
        <Text style={[styles.pickerBtnText, !value && styles.pickerBtnPlaceholder]}>
          {value ?? '— sin mapear —'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.dropdownModalBg} onPress={() => setOpen(false)}>
          <View style={[styles.dropdown, { position: 'absolute', top: btnY, left: spacing[4], right: spacing[4] }]}>
            <ScrollView style={{ maxHeight: 280 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              <Pressable
                style={styles.dropdownOption}
                onPress={() => { onChange(null); setOpen(false); }}
              >
                <Text style={[styles.dropdownOptionText, { color: colors.textDisabled }]}>
                  — sin mapear —
                </Text>
              </Pressable>
              {headers.map((h) => (
                <Pressable
                  key={h}
                  style={[styles.dropdownOption, value === h && styles.dropdownOptionActive]}
                  onPress={() => { onChange(h); setOpen(false); }}
                >
                  <Text style={[styles.dropdownOptionText, value === h && styles.dropdownOptionTextActive]}>
                    {h}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Contact columns multi-select ──────────────────────────────────────────────

function ContactColumnsSelector({
  headers,
  selected,
  onChange,
}: {
  headers: string[];
  selected: string[];
  onChange: (cols: string[]) => void;
}) {
  function toggle(h: string) {
    if (selected.includes(h)) {
      onChange(selected.filter((c) => c !== h));
    } else {
      onChange([...selected, h]);
    }
  }

  return (
    <View style={styles.pickerRow}>
      <Text style={styles.pickerLabel}>
        Columnas de contacto{' '}
        <Text style={{ color: colors.textDisabled, fontWeight: '400' }}>
          (teléfonos, mails, nombres de persona)
        </Text>
      </Text>
      <View style={styles.contactColGrid}>
        {headers.map((h) => {
          const active = selected.includes(h);
          const type = detectColumnType(h);
          return (
            <Pressable
              key={h}
              style={[styles.contactColChip, active && styles.contactColChipActive]}
              onPress={() => toggle(h)}
            >
              <MaterialCommunityIcons
                name={
                  type === 'phone' ? 'phone-outline' :
                  type === 'email' ? 'email-outline' :
                  type === 'name'  ? 'account-outline' :
                  'table-column'
                }
                size={13}
                color={active ? colors.primary : colors.textDisabled}
              />
              <Text style={[styles.contactColChipText, active && styles.contactColChipTextActive]}>
                {h}
              </Text>
              {active && (
                <MaterialCommunityIcons name="check" size={13} color={colors.primary} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Default product selector ──────────────────────────────────────────────────

function ProductSelector({ value, onChange }: { value: ProspectProduct; onChange: (v: ProspectProduct) => void }) {
  return (
    <View style={styles.chipRow}>
      {PRODUCTS.map((p) => (
        <Pressable
          key={p}
          style={[styles.chip, value === p && styles.chipActive]}
          onPress={() => onChange(p)}
        >
          <Text style={[styles.chipText, value === p && styles.chipTextActive]}>
            {PRODUCT_LABELS[p]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ImportScreen() {
  const profile = useAuthStore((s) => s.profile);
  const createProspect = useProspectsStore((s) => s.createProspect);
  const fetchProspects = useProspectsStore((s) => s.fetchProspects);

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ProspectMapping | null>(null);
  const [defaultProduct, setDefaultProduct] = useState<ProspectProduct>('crm');
  const [defaultStage] = useState<ProspectStage>('lead');

  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [toImport, setToImport] = useState(0);
  const [toSkip, setToSkip] = useState(0);
  const [tableAvailableWidth, setTableAvailableWidth] = useState(0);

  const [progress, setProgress] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [resultImported, setResultImported] = useState(0);
  const [resultErrors, setResultErrors] = useState(0);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function parseSheetIntoState(wb: XLSX.WorkBook, sheetName: string) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    if (rows.length === 0) return false;
    const headers = Object.keys(rows[0]);
    setParsed({ headers, rows });
    setMapping(autoDetect(headers));
    return true;
  }

  function rowCount(wb: XLSX.WorkBook, sheetName: string): number {
    const sheet = wb.Sheets[sheetName];
    const ref = sheet['!ref'];
    if (!ref) return 0;
    const range = XLSX.utils.decode_range(ref);
    return Math.max(0, range.e.r - range.s.r);
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: Platform.OS === 'web'
        ? ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.ms-excel']
        : '*/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setFileName(asset.name ?? 'archivo');

    try {
      const res = await fetch(asset.uri);
      const data = await res.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });

      setWorkbook(wb);
      setSheetNames(wb.SheetNames);

      if (wb.SheetNames.length === 1) {
        const ok = parseSheetIntoState(wb, wb.SheetNames[0]);
        if (ok) setStep('map');
      } else {
        setStep('sheet');
      }
    } catch {
      // silently ignore parse errors
    }
  }

  // ── Sheet selection ───────────────────────────────────────────────────────

  function selectSheet(sheetName: string) {
    if (!workbook) return;
    const ok = parseSheetIntoState(workbook, sheetName);
    if (ok) setStep('map');
  }

  // ── Preview ───────────────────────────────────────────────────────────────

  function goToPreview() {
    if (!parsed || !mapping) return;

    const rows: PreviewRow[] = [];
    let skip = 0;

    for (const raw of parsed.rows) {
      const name = mapping.name ? str(raw[mapping.name]) : null;
      if (!name) { skip++; continue; }

      // Store raw values for each contact column
      const contact_raws: Record<string, string | null> = {};
      for (const col of mapping.contact_columns) {
        contact_raws[col] = str(raw[col]);
      }

      rows.push({
        name,
        contact_raws,
        industry: mapping.industry ? str(raw[mapping.industry]) : null,
        address: mapping.address ? str(raw[mapping.address]) : null,
        zone: mapping.zone ? str(raw[mapping.zone]) : null,
        cuit: mapping.cuit ? str(raw[mapping.cuit]) : null,
        product: mapping.product ? str(raw[mapping.product]) : null,
        stage: mapping.stage ? str(raw[mapping.stage]) : null,
        notes: mapping.notes ? str(raw[mapping.notes]) : null,
        next_follow_up: mapping.next_follow_up ? str(raw[mapping.next_follow_up]) : null,
      });
    }

    setPreviewRows(rows);
    setToImport(rows.length);
    setToSkip(skip);
    setStep('preview');
  }

  // ── Import ────────────────────────────────────────────────────────────────

  async function runImport() {
    if (!profile?.company_id || !mapping) return;
    setProgressTotal(previewRows.length);
    setProgress(0);
    setStep('importing');

    let imported = 0;
    let errors = 0;

    for (const row of previewRows) {
      const product = parseProduct(row.product) ?? defaultProduct;
      const stage = parseStage(row.stage) ?? defaultStage;
      const next_follow_up = parseDate(row.next_follow_up);
      const contacts = buildContacts(row.contact_raws, mapping.contact_columns);

      const result = await createProspect({
        name: row.name,
        contacts,
        industry: row.industry ?? undefined,
        address: row.address ?? undefined,
        zone: row.zone ?? undefined,
        cuit: row.cuit ?? undefined,
        product,
        stage,
        notes: row.notes,
        next_follow_up,
      });

      if (result) imported++;
      else errors++;
      setProgress((p) => p + 1);
    }

    setResultImported(imported);
    setResultErrors(errors);
    await fetchProspects();
    setStep('done');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>

      {/* ── STEP: upload ────────────────────────────────────────── */}
      {step === 'upload' && (
        <View style={styles.uploadZone}>
          <MaterialCommunityIcons name="file-upload-outline" size={48} color={colors.primary} />
          <Text style={styles.uploadTitle}>Subir Excel o CSV</Text>
          <Text style={styles.uploadSub}>
            Columnas soportadas: cliente, contacto, teléfono 1/2, mail 1/2, rubro, dirección, zona, CUIT, producto, etapa, notas
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
            onPress={pickFile}
          >
            <MaterialCommunityIcons name="upload" size={18} color={colors.textOnPrimary} />
            <Text style={styles.primaryBtnText}>Seleccionar archivo</Text>
          </Pressable>
        </View>
      )}

      {/* ── STEP: sheet ─────────────────────────────────────────── */}
      {step === 'sheet' && workbook && (
        <View style={styles.card}>
          <Text style={styles.stepTitle}>Seleccionar hoja</Text>
          <Text style={styles.stepSub}>{fileName} · {sheetNames.length} hojas</Text>
          {sheetNames.map((name) => {
            const count = rowCount(workbook, name);
            return (
              <Pressable
                key={name}
                style={({ pressed }) => [styles.sheetOption, pressed && styles.sheetOptionPressed]}
                onPress={() => selectSheet(name)}
              >
                <View style={styles.sheetOptionContent}>
                  <MaterialCommunityIcons name="table" size={20} color={colors.primary} />
                  <View style={styles.sheetOptionText}>
                    <Text style={styles.sheetOptionName}>{name}</Text>
                    <Text style={styles.sheetOptionRows}>{count} filas</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textDisabled} />
              </Pressable>
            );
          })}
          <Pressable onPress={() => setStep('upload')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Elegir otro archivo</Text>
          </Pressable>
        </View>
      )}

      {/* ── STEP: map ───────────────────────────────────────────── */}
      {step === 'map' && parsed && mapping && (
        <View style={styles.card}>
          <Text style={styles.stepTitle}>Mapear columnas</Text>
          <Text style={styles.stepSub}>
            {fileName}{parsed.rows.length > 0 ? ` · ${parsed.rows.length} filas` : ''}
          </Text>

          {FIELDS.map((f) => (
            <ColumnPicker
              key={f.key}
              label={f.label}
              required={f.required}
              headers={parsed.headers}
              value={mapping[f.key] as string | null}
              onChange={(v) => setMapping({ ...mapping, [f.key]: v })}
            />
          ))}

          <ContactColumnsSelector
            headers={parsed.headers}
            selected={mapping.contact_columns}
            onChange={(cols) => setMapping({ ...mapping, contact_columns: cols })}
          />

          <Text style={styles.fieldLabel}>Producto por defecto (si la columna está vacía)</Text>
          <ProductSelector value={defaultProduct} onChange={setDefaultProduct} />

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, { marginTop: spacing[4] }, pressed && styles.primaryBtnPressed, !mapping.name && styles.primaryBtnDisabled]}
            onPress={goToPreview}
            disabled={!mapping.name}
          >
            <Text style={styles.primaryBtnText}>Vista previa →</Text>
          </Pressable>
          <Pressable onPress={() => setStep(sheetNames.length > 1 ? 'sheet' : 'upload')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← {sheetNames.length > 1 ? 'Elegir otra hoja' : 'Elegir otro archivo'}</Text>
          </Pressable>
        </View>
      )}

      {/* ── STEP: preview ───────────────────────────────────────── */}
      {step === 'preview' && mapping && (
        <View style={styles.card}>
          <Text style={styles.stepTitle}>Vista previa</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryNum}>{toImport}</Text>
              <Text style={styles.summarySub}>a importar</Text>
            </View>
            <View style={[styles.summaryChip, toSkip > 0 && styles.summaryChipWarn]}>
              <Text style={[styles.summaryNum, toSkip > 0 && { color: colors.warning }]}>{toSkip}</Text>
              <Text style={[styles.summarySub, toSkip > 0 && { color: colors.warning }]}>sin nombre (se omiten)</Text>
            </View>
          </View>

          <View onLayout={(e) => setTableAvailableWidth(e.nativeEvent.layout.width)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: tableAvailableWidth, alignItems: 'center' }}>
              <View style={styles.tableRow}>
                <Text style={[styles.tableHeader, { width: 160 }]}>Empresa</Text>
                <Text style={[styles.tableHeader, { width: 180 }]}>Contacto</Text>
                {mapping.industry && <Text style={[styles.tableHeader, { width: 110 }]}>Rubro</Text>}
                {mapping.address && <Text style={[styles.tableHeader, { width: 150 }]}>Dirección</Text>}
                {mapping.zone && <Text style={[styles.tableHeader, { width: 100 }]}>Zona</Text>}
                {mapping.cuit && <Text style={[styles.tableHeader, { width: 120 }]}>CUIT</Text>}
                <Text style={[styles.tableHeader, { width: 100 }]}>Producto</Text>
                <Text style={[styles.tableHeader, { width: 110 }]}>Etapa</Text>
              </View>
              {previewRows.slice(0, 5).map((row, i) => {
                const contacts = buildContacts(row.contact_raws, mapping.contact_columns);
                const c0 = contacts[0];
                const contactCell = contacts.length === 0
                  ? '—'
                  : [c0?.name, c0?.phone ?? c0?.email].filter(Boolean).join(' ')
                      + (contacts.length > 1 ? ` +${contacts.length - 1}` : '');
                return (
                  <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                    <Text style={[styles.tableCell, { width: 160 }]} numberOfLines={1}>{row.name}</Text>
                    <Text style={[styles.tableCell, { width: 180 }]} numberOfLines={1}>{contactCell}</Text>
                    {mapping.industry && <Text style={[styles.tableCell, { width: 110 }]} numberOfLines={1}>{row.industry ?? '—'}</Text>}
                    {mapping.address && <Text style={[styles.tableCell, { width: 150 }]} numberOfLines={1}>{row.address ?? '—'}</Text>}
                    {mapping.zone && <Text style={[styles.tableCell, { width: 100 }]} numberOfLines={1}>{row.zone ?? '—'}</Text>}
                    {mapping.cuit && <Text style={[styles.tableCell, { width: 120 }]} numberOfLines={1}>{row.cuit ?? '—'}</Text>}
                    <Text style={[styles.tableCell, { width: 100 }]} numberOfLines={1}>{PRODUCT_LABELS[parseProduct(row.product) ?? defaultProduct]}</Text>
                    <Text style={[styles.tableCell, { width: 110 }]} numberOfLines={1}>{STAGE_LABELS[parseStage(row.stage) ?? 'lead']}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
          </View>
          {previewRows.length > 5 && (
            <Text style={styles.moreText}>… y {previewRows.length - 5} más</Text>
          )}

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, { marginTop: spacing[4] }, pressed && styles.primaryBtnPressed]}
            onPress={runImport}
          >
            <Text style={styles.primaryBtnText}>Importar {toImport} prospectos</Text>
          </Pressable>
          <Pressable onPress={() => setStep('map')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Volver a mapear</Text>
          </Pressable>
        </View>
      )}

      {/* ── STEP: importing ─────────────────────────────────────── */}
      {step === 'importing' && (
        <View style={[styles.card, styles.centerCard]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stepTitle}>Importando…</Text>
          <Text style={styles.stepSub}>{progress} / {progressTotal}</Text>
        </View>
      )}

      {/* ── STEP: done ──────────────────────────────────────────── */}
      {step === 'done' && (
        <View style={[styles.card, styles.centerCard]}>
          <MaterialCommunityIcons name="check-circle-outline" size={56} color={colors.success} />
          <Text style={styles.stepTitle}>¡Listo!</Text>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryChip, styles.summaryChipSuccess]}>
              <Text style={[styles.summaryNum, { color: colors.success }]}>{resultImported}</Text>
              <Text style={[styles.summarySub, { color: colors.success }]}>importados</Text>
            </View>
            {resultErrors > 0 && (
              <View style={[styles.summaryChip, styles.summaryChipError]}>
                <Text style={[styles.summaryNum, { color: colors.error }]}>{resultErrors}</Text>
                <Text style={[styles.summarySub, { color: colors.error }]}>errores</Text>
              </View>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
            onPress={() => setStep('upload')}
          >
            <Text style={styles.primaryBtnText}>Importar otro archivo</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], gap: spacing[4] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
    ...shadows.subtle,
  },
  centerCard: { alignItems: 'center' },
  uploadZone: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[8],
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  uploadTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  uploadSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  stepTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  stepSub: { fontSize: fontSize.sm, color: colors.textSecondary },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  // Mapping
  pickerRow: { gap: spacing[1] },
  pickerLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: spacing[3],
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerBtnPressed: { opacity: 0.7 },
  pickerBtnText: { fontSize: fontSize.sm, color: colors.textPrimary },
  pickerBtnPlaceholder: { color: colors.textDisabled },
  dropdownModalBg: { flex: 1 },
  dropdown: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.subtle,
    maxHeight: 200,
  },
  dropdownOption: { padding: spacing[3] },
  dropdownOptionActive: { backgroundColor: colors.primaryLight },
  dropdownOptionText: { fontSize: fontSize.sm, color: colors.textPrimary },
  dropdownOptionTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  // Contact columns multi-select
  contactColGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  contactColChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  contactColChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  contactColChipText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  contactColChipTextActive: { color: colors.primary },
  // Default product chips
  chipRow: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  chipTextActive: { color: colors.primary },
  // Summary
  summaryRow: { flexDirection: 'row', gap: spacing[3] },
  summaryChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  summaryChipWarn: { backgroundColor: colors.warningLight },
  summaryChipSuccess: { backgroundColor: colors.successLight },
  summaryChipError: { backgroundColor: colors.errorLight },
  summaryNum: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.textPrimary },
  summarySub: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center' },
  // Preview table
  tableRow: { flexDirection: 'row' },
  tableRowAlt: { backgroundColor: colors.background },
  tableHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    padding: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableCell: {
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    padding: spacing[2],
  },
  moreText: { fontSize: fontSize.sm, color: colors.textDisabled, textAlign: 'center' },
  // Buttons
  primaryBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    alignSelf: 'stretch',
  },
  primaryBtnPressed: { opacity: 0.85 },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: colors.textOnPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  backBtn: { alignItems: 'center', paddingVertical: spacing[2] },
  backBtnText: { fontSize: fontSize.sm, color: colors.textSecondary },
  // Sheet selector
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  sheetOptionPressed: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  sheetOptionContent: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  sheetOptionText: { gap: 2 },
  sheetOptionName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  sheetOptionRows: { fontSize: fontSize.sm, color: colors.textSecondary },
});
