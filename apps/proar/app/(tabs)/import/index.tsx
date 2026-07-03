/**
 * Import Wizard — web only
 * Admin/product_manager uploads an Excel/CSV file, maps columns, previews
 * and imports. Supports three import types: Clientes, Gestiones, Productos
 * (Productos gated to admin/root/product_manager).
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
import * as XLSX from 'xlsx';

import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useClientsStore } from '@/stores/clientsStore';
import { usePermissions } from '@/hooks/usePermissions';
import { useVisitsStore } from '@/stores/visitsStore';
import { useProductsStore } from '@/stores/productsStore';
import type { VisitStatus, VisitType } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

type ImportType = 'clientes' | 'gestiones' | 'productos';
type Step = 'upload' | 'map' | 'preview' | 'importing' | 'done';

interface ParsedSheet {
  headers: string[];
  rows: Record<string, unknown>[];
}

interface ClientMapping {
  name: string | null;
  cuit: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

interface GestionMapping {
  clientName: string | null;
  date: string | null;
  notes: string | null;
}

interface ProductMapping {
  code: string | null;
  name: string | null;
  presentationLabel: string | null;
  unit: string | null;
  quantity: string | null;
  price: string | null;
  freight: string | null;
  notes: string | null;
}

type ColumnMapping = ClientMapping | GestionMapping | ProductMapping;

// ─── Config ───────────────────────────────────────────────────────────────────

const CLIENT_FIELDS: {
  key: keyof ClientMapping;
  label: string;
  required?: boolean;
  hint?: string;
}[] = [
  { key: 'name', label: 'Nombre del cliente', required: true },
  { key: 'cuit', label: 'CUIT / Documento', hint: 'Clave de deduplicación' },
  { key: 'address', label: 'Domicilio', hint: 'Clave de deduplicación' },
  { key: 'city', label: 'Localidad' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'email', label: 'Email' },
  { key: 'notes', label: 'Notas' },
];

const GESTION_FIELDS: {
  key: keyof GestionMapping;
  label: string;
  required?: boolean;
  hint?: string;
}[] = [
  {
    key: 'clientName',
    label: 'Nombre del cliente',
    required: true,
    hint: 'Debe matchear un cliente existente',
  },
  { key: 'date', label: 'Fecha', required: true },
  { key: 'notes', label: 'Minuta / Notas' },
];

const PRODUCT_FIELDS: {
  key: keyof ProductMapping;
  label: string;
  required?: boolean;
  hint?: string;
}[] = [
  { key: 'code', label: 'Código de producto', hint: 'Opcional, se usa el nombre si falta' },
  { key: 'name', label: 'Nombre / Denominación', required: true },
  { key: 'presentationLabel', label: 'Presentación (envase)', required: true },
  {
    key: 'unit',
    label: 'Unidad',
    required: true,
    hint: 'Si va junto con la cantidad (ej. "20kg"), elegí la misma columna en ambos campos',
  },
  { key: 'quantity', label: 'Cantidad por envase' },
  { key: 'price', label: 'Precio USD', required: true },
  { key: 'freight', label: 'Flete USD/kg' },
  { key: 'notes', label: 'Notas / Descripción' },
];

const GESTION_TYPE_OPTIONS: { value: VisitType; label: string }[] = [
  { value: 'customer_service', label: 'Atención al cliente' },
  { value: 'quote', label: 'Cotizaciones' },
  { value: 'sales_orders', label: 'Ventas y pedidos' },
  { value: 'new_projects', label: 'Prospectos' },
  { value: 'payments', label: 'Pagos y cobranzas' },
  { value: 'technical_service', label: 'Servicio técnico' },
  { value: 'other', label: 'Otros' },
];

const GESTION_STATUS_OPTIONS: { value: VisitStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'completed', label: 'Completada' },
  { value: 'canceled', label: 'Cancelada' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function str(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  return s === '' || s.toLowerCase() === 'nan' ? null : s;
}

function num(val: unknown): number | null {
  if (val == null) return null;
  const n = parseFloat(String(val).trim().replace(',', '.'));
  return isNaN(n) ? null : n;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** Parse a date cell (Excel Date object or common string formats) to ISO. */
function parseDate(val: unknown): string | null {
  if (!val) return null;
  let d: Date | null = null;
  if (val instanceof Date) {
    d = val;
  } else {
    const s = String(val).trim();
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (dmy) {
      const [, dd, mm, yyRaw] = dmy;
      const yy = yyRaw.length === 2 ? `20${yyRaw}` : yyRaw;
      d = new Date(Number(yy), Number(mm) - 1, Number(dd), 10, 0, 0);
    } else {
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) d = parsed;
    }
  }
  if (!d || isNaN(d.getTime())) return null;
  if (d.getHours() === 0 && d.getMinutes() === 0) d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

function inferProductType(code: string): 'commodity' | 'formulated' {
  return /^PL\s/i.test(code) ? 'formulated' : 'commodity';
}

/** Splits a combined "20kg" / "1,300 kg" cell into { quantity, unit }. */
function parseQtyUnit(raw: unknown): { quantity: number | null; unit: string } {
  const s = String(raw ?? '').trim();
  if (!s || /^granel$/i.test(s)) return { quantity: null, unit: 'kg' };
  const m = s.match(/^([\d.,]+)\s*([a-zA-Záéíóúñ]+)?/);
  if (!m) return { quantity: null, unit: 'kg' };
  const qty = parseFloat(m[1].replace(/,/g, ''));
  return { quantity: isNaN(qty) ? null : qty, unit: m[2] || 'kg' };
}

function autoDetectMapping(
  headers: string[],
  type: ImportType
): ColumnMapping {
  const h = (name: string) =>
    headers.find((c) => c.toLowerCase().includes(name.toLowerCase())) ?? null;

  if (type === 'clientes') {
    return {
      name: h('cliente') ?? h('nombre'),
      cuit: h('cuit') ?? h('documento'),
      address: h('domicilio') ?? h('dirección') ?? h('direccion'),
      city: h('localidad') ?? h('ciudad'),
      phone: h('tel') ?? h('teléfono') ?? h('telefono'),
      email: h('mail') ?? h('email'),
      notes: h('nota'),
    } as ClientMapping;
  }
  if (type === 'gestiones') {
    return {
      clientName: h('cliente') ?? h('nombre'),
      date: h('fecha'),
      notes: h('minuta') ?? h('nota'),
    } as GestionMapping;
  }
  return {
    code: h('producto') ?? h('código') ?? h('codigo'),
    name: h('denominaci') ?? h('nombre'),
    presentationLabel: h('envase') ?? h('presentaci'),
    unit: h('unidad'),
    quantity: h('cantidad'),
    price: h('precio') ?? h('costo'),
    freight: h('flete'),
    notes: h('nota') ?? h('descripci'),
  } as ProductMapping;
}

// ─── Column picker (reused across all mapping fields) ────────────────────────

function ColumnPicker({
  label,
  required,
  hint,
  value,
  headers,
  onChange,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  value: string | null;
  headers: string[];
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={pickerStyles.row}>
      <View style={pickerStyles.labelCol}>
        <Text style={pickerStyles.label}>
          {label}
          {required && <Text style={pickerStyles.required}> *</Text>}
        </Text>
        {hint && <Text style={pickerStyles.hint}>{hint}</Text>}
      </View>

      <Pressable
        style={pickerStyles.trigger}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
      >
        <Text
          style={[
            pickerStyles.triggerText,
            !value && pickerStyles.triggerPlaceholder,
          ]}
          numberOfLines={1}
        >
          {value ?? '— No importar —'}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={pickerStyles.backdrop} onPress={() => setOpen(false)}>
          <View style={pickerStyles.dropdown}>
            <Text style={pickerStyles.dropdownTitle}>{label}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <Pressable
                style={pickerStyles.option}
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    pickerStyles.optionText,
                    !value && pickerStyles.optionSelected,
                  ]}
                >
                  — No importar —
                </Text>
              </Pressable>
              {headers.map((hdr) => (
                <Pressable
                  key={hdr}
                  style={pickerStyles.option}
                  onPress={() => {
                    onChange(hdr);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      pickerStyles.optionText,
                      value === hdr && pickerStyles.optionSelected,
                    ]}
                  >
                    {hdr}
                  </Text>
                  {value === hdr && (
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color={colors.primary}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  labelCol: { flex: 1 },
  label: { fontSize: fontSize.sm, color: colors.textPrimary },
  required: { color: colors.error },
  hint: { fontSize: fontSize.xs, color: colors.textDisabled },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    minWidth: 160,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  triggerText: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary },
  triggerPlaceholder: { color: colors.textDisabled },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    width: 320,
    maxHeight: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  dropdownTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing[2],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
  },
  optionText: { fontSize: fontSize.sm, color: colors.textPrimary },
  optionSelected: { color: colors.primary, fontWeight: fontWeight.semibold },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ImportWizardScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const fetchClients = useClientsStore((s) => s.fetchClients);
  const createClient = useClientsStore((s) => s.createClient);

  const createVisit = useVisitsStore((s) => s.createVisit);

  const fetchProducts = useProductsStore((s) => s.fetchProducts);
  const createProduct = useProductsStore((s) => s.createProduct);
  const addPresentation = useProductsStore((s) => s.addPresentation);

  const { isAdminOrRoot: isAdmin, canManageProducts } = usePermissions();

  const [step, setStep] = useState<Step>('upload');
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);

  // Gestiones-only fixed selectors
  const [gestionType, setGestionType] = useState<VisitType>('customer_service');
  const [gestionStatus, setGestionStatus] = useState<VisitStatus>('completed');

  // Preview
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState<
    Record<string, string | null>[]
  >([]);
  const [totalRows, setTotalRows] = useState(0);
  const [toImport, setToImport] = useState(0);
  const [toSkip, setToSkip] = useState(0);

  // Internal staged data per type (built in goToPreview, consumed in runImport)
  const [stagedClients, setStagedClients] = useState<
    {
      name: string;
      cuit: string | null;
      address: string | null;
      city: string | null;
      phone: string | null;
      email: string | null;
      notes: string | null;
    }[]
  >([]);
  const [stagedGestiones, setStagedGestiones] = useState<
    { clientId: string; date: string; notes: string | null }[]
  >([]);
  const [stagedProductRows, setStagedProductRows] = useState<
    {
      code: string;
      name: string;
      presentationLabel: string;
      unit: string;
      quantity: number | null;
      price: number;
      freight: number | null;
      notes: string | null;
    }[]
  >([]);

  // Import progress
  const [progress, setProgress] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  // Done
  const [resultImported, setResultImported] = useState(0);
  const [resultSkipped, setResultSkipped] = useState(0);
  const [resultErrors, setResultErrors] = useState(0);

  // The wizard stays mounted in the background when navigating away (tab
  // screens aren't unmounted), so reset to a clean state every time it
  // regains focus — otherwise it reopens showing the last "done" screen.
  useFocusEffect(
    useCallback(() => {
      setStep((prev) => (prev === 'importing' ? prev : 'upload'));
      setImportType(null);
      setParsed(null);
      setFileName(null);
      setMapping(null);
      setPreviewRows([]);
      setTotalRows(0);
      setToImport(0);
      setToSkip(0);
      setStagedClients([]);
      setStagedGestiones([]);
      setStagedProductRows([]);
      setProgress(0);
      setProgressTotal(0);
      setResultImported(0);
      setResultSkipped(0);
      setResultErrors(0);
    }, [])
  );

  // ── File picker ────────────────────────────────────────────────────────────

  function pickFile() {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setFileName(file.name);
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const wb = XLSX.read(data, { type: 'array', cellDates: true, codepage: 65001 });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: null,
      });
      const headerRow = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
      })[0] as string[];
      setParsed({ headers: headerRow.filter(Boolean), rows });
    };
    input.click();
  }

  // ── Step: upload → map ─────────────────────────────────────────────────────

  function goToMap() {
    if (!parsed || !importType) return;
    setMapping(autoDetectMapping(parsed.headers, importType));
    setStep('map');
  }

  // ── Step: map → preview ────────────────────────────────────────────────────

  async function goToPreview() {
    if (!parsed || !mapping || !importType) return;
    setPreviewLoading(true);
    setStep('preview');

    if (importType === 'clientes') {
      const m = mapping as ClientMapping;
      await fetchClients();
      const existing = useClientsStore.getState().clients;
      const existingKeys = new Set(
        existing.map((c) => `${normalize(c.name)}|${normalize(c.address ?? '')}`)
      );

      const mapped = parsed.rows.map((r) => ({
        name: str(m.name ? r[m.name] : null) ?? '',
        cuit: m.cuit ? str(r[m.cuit]) : null,
        address: m.address ? str(r[m.address]) : null,
        city: m.city ? str(r[m.city]) : null,
        phone: m.phone ? str(r[m.phone]) : null,
        email: m.email ? str(r[m.email])?.toLowerCase() ?? null : null,
        notes: m.notes ? str(r[m.notes]) : null,
      }));

      const seen = new Set<string>();
      const newRows = mapped.filter((row) => {
        if (!row.name) return false;
        const key = `${normalize(row.name)}|${normalize(row.address ?? '')}`;
        if (existingKeys.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setStagedClients(newRows);
      setTotalRows(mapped.length);
      setToImport(newRows.length);
      setToSkip(mapped.length - newRows.length);
      setPreviewRows(
        newRows.slice(0, 20).map((r) => ({
          Nombre: r.name,
          CUIT: r.cuit,
          Domicilio: r.address,
          Localidad: r.city,
          Teléfono: r.phone,
          Email: r.email,
        }))
      );
    } else if (importType === 'gestiones') {
      const m = mapping as GestionMapping;
      await fetchClients();
      const existing = useClientsStore.getState().clients;
      const clientByName = new Map(
        existing.map((c) => [normalize(c.name), c.id])
      );

      const mapped = parsed.rows.map((r) => ({
        clientName: str(m.clientName ? r[m.clientName] : null),
        date: m.date ? parseDate(r[m.date]) : null,
        notes: m.notes ? str(r[m.notes]) : null,
      }));

      const valid: { clientId: string; date: string; notes: string | null }[] =
        [];
      let skipped = 0;
      for (const row of mapped) {
        const clientId = row.clientName
          ? clientByName.get(normalize(row.clientName))
          : undefined;
        if (!clientId || !row.date) {
          skipped++;
          continue;
        }
        valid.push({ clientId, date: row.date, notes: row.notes });
      }

      setStagedGestiones(valid);
      setTotalRows(mapped.length);
      setToImport(valid.length);
      setToSkip(skipped);
      setPreviewRows(
        mapped.slice(0, 20).map((r) => ({
          Cliente: r.clientName,
          Fecha: r.date,
          Notas: r.notes,
        }))
      );
    } else {
      const m = mapping as ProductMapping;
      await fetchProducts();
      const existing = useProductsStore.getState().products;
      const existingPresKeys = new Set(
        existing.flatMap((p) =>
          p.presentations.map(
            (pr) => `${normalize(p.code ?? p.name)}|${normalize(pr.label)}`
          )
        )
      );

      // Unit and quantity are often combined in one cell (e.g. "20kg").
      // If the same column was picked for both, split it instead of reading twice.
      const unitQtyCombined = !!m.unit && !!m.quantity && m.unit === m.quantity;

      const mapped = parsed.rows.map((r) => {
        let unit: string;
        let quantity: number | null;
        if (unitQtyCombined) {
          const parsed2 = parseQtyUnit(r[m.unit!]);
          unit = parsed2.unit;
          quantity = parsed2.quantity;
        } else {
          unit = str(m.unit ? r[m.unit] : null) ?? 'kg';
          quantity = m.quantity ? num(r[m.quantity]) : null;
        }
        return {
          code: str(m.code ? r[m.code] : null) ?? '',
          name: str(m.name ? r[m.name] : null) ?? '',
          presentationLabel:
            str(m.presentationLabel ? r[m.presentationLabel] : null) ?? '',
          unit,
          quantity,
          price: m.price ? num(r[m.price]) ?? 0 : 0,
          freight: m.freight ? num(r[m.freight]) : null,
          notes: m.notes ? str(r[m.notes]) : null,
        };
      });

      const seen = new Set<string>();
      const newRows = mapped.filter((row) => {
        const productKey = row.code || row.name;
        if (!productKey || !row.presentationLabel) return false;
        const key = `${normalize(productKey)}|${normalize(row.presentationLabel)}`;
        if (existingPresKeys.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setStagedProductRows(newRows);
      setTotalRows(mapped.length);
      setToImport(newRows.length);
      setToSkip(mapped.length - newRows.length);
      setPreviewRows(
        newRows.slice(0, 20).map((r) => ({
          Código: r.code || '—',
          Nombre: r.name,
          Presentación: r.presentationLabel,
          Cantidad: r.quantity != null ? String(r.quantity) : null,
          Unidad: r.unit,
          Precio: String(r.price),
          Flete: r.freight != null ? String(r.freight) : null,
          Notas: r.notes,
        }))
      );
    }

    setPreviewLoading(false);
  }

  // ── Step: preview → import ─────────────────────────────────────────────────

  async function runImport() {
    setStep('importing');
    let imported = 0;
    let errors = 0;

    if (importType === 'clientes') {
      setProgressTotal(stagedClients.length);
      for (const [i, row] of stagedClients.entries()) {
        setProgress(i + 1);
        const contacts =
          row.phone || row.email
            ? [{ phone: row.phone ?? undefined, email: row.email ?? undefined }]
            : [];
        const result = await createClient({
          name: row.name,
          cuit: row.cuit ?? undefined,
          address: row.address ?? undefined,
          city: row.city ?? undefined,
          contacts,
          notes: row.notes ?? undefined,
        });
        if (result) imported++;
        else errors++;
      }
    } else if (importType === 'gestiones') {
      setProgressTotal(stagedGestiones.length);
      for (const [i, row] of stagedGestiones.entries()) {
        setProgress(i + 1);
        const result = await createVisit({
          client_id: row.clientId,
          scheduled_at: row.date,
          status: gestionStatus,
          type: gestionType,
          notes: row.notes ?? undefined,
        });
        if (result) imported++;
        else errors++;
      }
    } else {
      setProgressTotal(stagedProductRows.length);
      // Group by code (falling back to name when code wasn't mapped) so each
      // product is created once, then add its presentations.
      const byCode = new Map<string, typeof stagedProductRows>();
      for (const row of stagedProductRows) {
        const key = normalize(row.code || row.name);
        if (!byCode.has(key)) byCode.set(key, []);
        byCode.get(key)!.push(row);
      }

      let done = 0;
      const productsNow = useProductsStore.getState().products;
      const byCodeExisting = new Map(
        productsNow.map((p) => [normalize(p.code || p.name), p])
      );

      for (const [, rows] of byCode) {
        const first = rows[0];
        const groupKey = normalize(first.code || first.name);
        let product = byCodeExisting.get(groupKey);
        if (!product) {
          const created = await createProduct({
            name: first.name || first.code,
            code: first.code || null,
            type: inferProductType(first.code || first.name),
            notes: first.notes ?? undefined,
            presentations: [],
          });
          if (!created) {
            errors += rows.length;
            done += rows.length;
            setProgress(done);
            continue;
          }
          product = created;
          byCodeExisting.set(groupKey, product);
        }

        for (const row of rows) {
          const result = await addPresentation(product.id, {
            label: row.presentationLabel,
            unit: row.unit,
            quantity: row.quantity,
            price_usd: row.price,
            freight_usd: row.freight,
          });
          if (result) imported++;
          else errors++;
          done++;
          setProgress(done);
        }
      }
    }

    setResultImported(imported);
    setResultSkipped(toSkip);
    setResultErrors(errors);
    setStep('done');
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function isMappingValid(): boolean {
    if (!mapping) return false;
    if (importType === 'clientes') return !!(mapping as ClientMapping).name;
    if (importType === 'gestiones') {
      const m = mapping as GestionMapping;
      return !!m.clientName && !!m.date;
    }
    const m = mapping as ProductMapping;
    return !!m.name && !!m.presentationLabel && !!m.unit && !!m.price;
  }

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="monitor" size={40} color={colors.textDisabled} />
        <Text style={styles.guardText}>
          El importador solo está disponible en la versión web.
        </Text>
      </View>
    );
  }

  if (!isAdmin && !canManageProducts) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="lock-outline" size={40} color={colors.textDisabled} />
        <Text style={styles.guardText}>Solo disponible para administradores.</Text>
      </View>
    );
  }

  // ── Step renders ───────────────────────────────────────────────────────────

  function renderUpload() {
    const typeOptions: {
      type: ImportType;
      label: string;
      icon: keyof typeof MaterialCommunityIcons.glyphMap;
      desc: string;
      disabled?: boolean;
    }[] = [
      {
        type: 'clientes',
        label: 'Clientes',
        icon: 'account-group-outline',
        desc: 'Nombre, CUIT, contacto…',
      },
      {
        type: 'gestiones',
        label: 'Gestiones',
        icon: 'calendar-outline',
        desc: 'Vincula a clientes existentes',
      },
      {
        type: 'productos',
        label: 'Productos',
        icon: 'flask-outline',
        desc: 'Catálogo y presentaciones',
        disabled: !canManageProducts,
      },
    ];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>1 · Subir archivo y elegir tipo</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Archivo Excel / CSV</Text>
          <Pressable style={styles.filePicker} onPress={pickFile}>
            <MaterialCommunityIcons
              name={fileName ? 'file-check-outline' : 'file-upload-outline'}
              size={28}
              color={fileName ? colors.success : colors.textSecondary}
            />
            <Text
              style={[styles.filePickerText, fileName && { color: colors.success }]}
            >
              {fileName ?? 'Seleccionar archivo…'}
            </Text>
          </Pressable>
          {parsed && (
            <Text style={styles.hint}>
              {parsed.rows.length} filas · {parsed.headers.length} columnas detectadas
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>¿Qué vas a importar?</Text>
          <View style={styles.typeRow}>
            {typeOptions.map((opt) => (
              <Pressable
                key={opt.type}
                style={[
                  styles.typeCard,
                  importType === opt.type && styles.typeCardActive,
                  opt.disabled && styles.typeCardDisabled,
                ]}
                onPress={() => !opt.disabled && setImportType(opt.type)}
                disabled={opt.disabled}
              >
                <MaterialCommunityIcons
                  name={opt.icon}
                  size={28}
                  color={
                    opt.disabled
                      ? colors.textDisabled
                      : importType === opt.type
                        ? colors.primary
                        : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.typeLabel,
                    importType === opt.type && styles.typeLabelActive,
                    opt.disabled && { color: colors.textDisabled },
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={styles.typeDesc}>
                  {opt.disabled ? 'Sin permiso' : opt.desc}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          style={[styles.btn, (!parsed || !importType) && styles.btnDisabled]}
          onPress={goToMap}
          disabled={!parsed || !importType}
        >
          <Text style={styles.btnText}>Siguiente →</Text>
        </Pressable>
      </View>
    );
  }

  function renderMap() {
    if (!parsed || !mapping) return null;
    const fields =
      importType === 'clientes'
        ? CLIENT_FIELDS
        : importType === 'gestiones'
          ? GESTION_FIELDS
          : PRODUCT_FIELDS;

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>2 · Mapear columnas</Text>
        <Text style={styles.stepSubtitle}>
          Asigná cada campo del sistema a una columna del archivo.
        </Text>

        <View style={styles.card}>
          {fields.map((field) => (
            <ColumnPicker
              key={field.key}
              label={field.label}
              required={field.required}
              hint={field.hint}
              value={(mapping as unknown as Record<string, string | null>)[field.key]}
              headers={parsed.headers}
              onChange={(v) =>
                setMapping((prev) => (prev ? { ...prev, [field.key]: v } : prev))
              }
            />
          ))}
        </View>

        {importType === 'gestiones' && (
          <View style={styles.card}>
            <Text style={styles.label}>Tipo de gestión (aplica a todas)</Text>
            <View style={styles.typeRow}>
              {GESTION_TYPE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.radioChip,
                    gestionType === opt.value && styles.radioChipActive,
                  ]}
                  onPress={() => setGestionType(opt.value)}
                >
                  <Text
                    style={[
                      styles.radioChipText,
                      gestionType === opt.value && styles.radioChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.label, { marginTop: spacing[3] }]}>
              Estado (aplica a todas)
            </Text>
            <View style={styles.typeRow}>
              {GESTION_STATUS_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.radioChip,
                    gestionStatus === opt.value && styles.radioChipActive,
                  ]}
                  onPress={() => setGestionStatus(opt.value)}
                >
                  <Text
                    style={[
                      styles.radioChipText,
                      gestionStatus === opt.value && styles.radioChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.row}>
          <Pressable style={styles.btnSecondary} onPress={() => setStep('upload')}>
            <Text style={styles.btnSecondaryText}>← Volver</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnFlex, !isMappingValid() && styles.btnDisabled]}
            onPress={goToPreview}
            disabled={!isMappingValid()}
          >
            <Text style={styles.btnText}>Vista previa →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderPreview() {
    if (previewLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.hint}>Analizando datos…</Text>
        </View>
      );
    }

    const previewCols = previewRows[0] ? Object.keys(previewRows[0]) : [];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>3 · Vista previa</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalRows}</Text>
            <Text style={styles.statLabel}>Total filas</Text>
          </View>
          <View style={[styles.statCard, styles.statCardSuccess]}>
            <Text style={[styles.statNumber, { color: colors.success }]}>
              {toImport}
            </Text>
            <Text style={styles.statLabel}>Nuevos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.textSecondary }]}>
              {toSkip}
            </Text>
            <Text style={styles.statLabel}>
              {importType === 'gestiones' ? 'Sin matchear' : 'Ya existen'}
            </Text>
          </View>
        </View>

        {previewRows.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.label}>Primeras {previewRows.length} filas</Text>
            <ScrollView horizontal>
              <View>
                <View style={styles.tableRow}>
                  {previewCols.map((col) => (
                    <Text key={col} style={styles.tableHeader}>
                      {col}
                    </Text>
                  ))}
                </View>
                {previewRows.map((row, i) => (
                  <View
                    key={i}
                    style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}
                  >
                    {previewCols.map((col) => (
                      <Text key={col} style={styles.tableCell} numberOfLines={1}>
                        {row[col] ?? '—'}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {toImport === 0 ? (
          <View style={[styles.card, styles.warningBox]}>
            <MaterialCommunityIcons
              name="alert-outline"
              size={16}
              color={colors.warning}
            />
            <Text style={styles.warningText}>
              No hay registros nuevos para importar.
            </Text>
          </View>
        ) : null}

        <View style={styles.row}>
          <Pressable style={styles.btnSecondary} onPress={() => setStep('map')}>
            <Text style={styles.btnSecondaryText}>← Volver</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnFlex, toImport === 0 && styles.btnDisabled]}
            onPress={runImport}
            disabled={toImport === 0}
          >
            <Text style={styles.btnText}>Importar {toImport} →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderImporting() {
    const pct = progressTotal > 0 ? progress / progressTotal : 0;
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.importingText}>
          {progress} / {progressTotal}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
        </View>
        <Text style={styles.hint}>Importando, no cierres esta página…</Text>
      </View>
    );
  }

  function renderDone() {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons
          name="check-circle-outline"
          size={56}
          color={colors.success}
        />
        <Text style={styles.doneTitle}>¡Importación completa!</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardSuccess]}>
            <Text style={[styles.statNumber, { color: colors.success }]}>
              {resultImported}
            </Text>
            <Text style={styles.statLabel}>Importados</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{resultSkipped}</Text>
            <Text style={styles.statLabel}>Omitidos</Text>
          </View>
          {resultErrors > 0 && (
            <View style={[styles.statCard, { borderColor: colors.error }]}>
              <Text style={[styles.statNumber, { color: colors.error }]}>
                {resultErrors}
              </Text>
              <Text style={styles.statLabel}>Errores</Text>
            </View>
          )}
        </View>

        <Pressable
          style={[styles.btn, { marginTop: spacing[4] }]}
          onPress={() => router.push('/(tabs)/settings')}
        >
          <Text style={styles.btnText}>Volver a Ajustes</Text>
        </Pressable>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {step === 'upload' && renderUpload()}
      {step === 'map' && renderMap()}
      {step === 'preview' && renderPreview()}
      {step === 'importing' && renderImporting()}
      {step === 'done' && renderDone()}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing[4],
    paddingBottom: spacing[12],
    gap: spacing[4],
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
    gap: spacing[3],
  },
  guardText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },

  stepContainer: { gap: spacing[4] },
  stepTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  stepSubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginTop: -spacing[2],
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[3],
  },

  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  hint: { fontSize: fontSize.xs, color: colors.textDisabled, textAlign: 'center' },

  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    justifyContent: 'center',
  } as const,
  filePickerText: { fontSize: fontSize.base, color: colors.textSecondary },

  typeRow: { flexDirection: 'row', gap: spacing[3], flexWrap: 'wrap' },
  typeCard: {
    flex: 1,
    minWidth: 140,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.background,
  },
  typeCardActive: { borderColor: colors.primary, backgroundColor: '#EFF6FF' },
  typeCardDisabled: { opacity: 0.5 },
  typeLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  typeLabelActive: { color: colors.primary },
  typeDesc: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center' },

  radioChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  radioChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  radioChipText: { fontSize: fontSize.sm, color: colors.textPrimary },
  radioChipTextActive: { color: colors.textOnPrimary, fontWeight: fontWeight.semibold },

  row: { flexDirection: 'row', gap: spacing[3] },
  btnFlex: { flex: 1 },

  btn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnSecondaryText: { fontSize: fontSize.base, color: colors.textSecondary },

  statsRow: { flexDirection: 'row', gap: spacing[3] },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    alignItems: 'center',
    backgroundColor: colors.surface,
    gap: spacing[1],
  },
  statCardSuccess: { borderColor: colors.success },
  statNumber: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center' },

  tableRow: { flexDirection: 'row' },
  tableRowAlt: { backgroundColor: colors.background },
  tableHeader: {
    width: 150,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    padding: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableCell: {
    width: 150,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    padding: spacing[2],
  },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
  },
  warningText: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary },

  importingText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  progressTrack: {
    width: 280,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  } as const,

  doneTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
});
