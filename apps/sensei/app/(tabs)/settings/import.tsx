/**
 * Import Wizard — web only
 * Admin uploads an Excel file, maps columns, previews and imports.
 * Supports two import types: Clientes and Empleados/Sucursales.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as XLSX from 'xlsx';
import * as Linking from 'expo-linking';

import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// ─── Types ───────────────────────────────────────────────────────────────────

type ImportType = 'clientes' | 'empleados';
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
  phone2: string | null;
  email: string | null;
  commercial_classification: string | null;
  branch: string | null;
  notes: string | null;
  notes2: string | null;
  notes3: string | null;
}

interface EmployeeMapping {
  branch: string | null;
  employee_name: string | null;
  username: string | null;
}

type ColumnMapping = ClientMapping | EmployeeMapping;

// ─── Config ───────────────────────────────────────────────────────────────────

const CLIENT_FIELDS: {
  key: keyof ClientMapping;
  label: string;
  required?: boolean;
  hint?: string;
}[] = [
  { key: 'name', label: 'Nombre del cliente', required: true },
  { key: 'cuit', label: 'Documento / CUIT', hint: 'Clave de deduplicación — se normalizan guiones y puntos' },
  { key: 'address', label: 'Domicilio' },
  { key: 'city', label: 'Localidad' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'phone2', label: 'Teléfono 2 / Móvil' },
  { key: 'email', label: 'Email' },
  {
    key: 'commercial_classification',
    label: 'Calificación',
    hint: 'Configurá abajo qué valor equivale a "Oro"',
  },
  { key: 'branch', label: 'Unidad de Negocio' },
  { key: 'notes', label: 'Notas (campo 1)' },
  { key: 'notes2', label: 'Notas (campo 2)' },
  { key: 'notes3', label: 'Notas (campo 3)' },
];

const EMPLOYEE_FIELDS: {
  key: keyof EmployeeMapping;
  label: string;
  required?: boolean;
  hint?: string;
}[] = [
  { key: 'branch', label: 'Sucursal / Unidad de Negocio', required: true },
  { key: 'employee_name', label: 'Nombre del colaborador' },
  {
    key: 'username',
    label: 'Usuario (sin @dominio)',
    hint: 'Se usará para invitar: usuario@sensei.com.ar',
  },
];

const EMAIL_DOMAIN = 'sensei.com.ar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function str(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  return s === '' || s.toLowerCase() === 'nan' ? null : s;
}

function phone(val: unknown): string | null {
  if (val == null) return null;
  const n = Number(val);
  if (isNaN(n) || n === 0) return null;
  return Math.round(n).toString();
}

function documento(val: unknown): string | null {
  if (val == null) return null;
  const raw = String(val).trim();
  if (raw === '' || raw.toLowerCase() === 'nan') return null;

  // CUIL with dashes: 27-28534297-5 → 27285342975
  if (raw.includes('-')) {
    const s = raw.replace(/[-\s]/g, '');
    if (/^\d+$/.test(s)) return s;
  }

  // DNI with dots as group separators: 28.534.297 → 28534297
  // vs Excel decimal: 28534297.0 → 28534297
  if (raw.includes('.')) {
    const parts = raw.split('.');
    const looksLikeGroupSep =
      parts.length > 2 && parts.slice(1).every((p) => p.length === 3);
    if (looksLikeGroupSep) return parts.join('') || null;
    // Decimal (Excel float)
    const n = Number(raw);
    if (!isNaN(n) && n !== 0) return Math.round(n).toString();
  }

  // Plain number
  const n = Number(raw);
  if (!isNaN(n) && n !== 0) return Math.round(n).toString();

  return raw || null;
}

function autoDetectMapping(
  headers: string[],
  type: ImportType
): ClientMapping | EmployeeMapping {
  const h = (name: string) =>
    headers.find(
      (c) => c.toLowerCase().includes(name.toLowerCase())
    ) ?? null;

  if (type === 'clientes') {
    return {
      name: h('apellido') ?? h('nombre') ?? h('cliente') ?? null,
      cuit: h('documento') ?? h('cuil') ?? h('cuit') ?? h('dni') ?? null,
      address: h('domicil') ?? h('direcc') ?? null,
      city: h('localidad') ?? h('ciudad') ?? null,
      phone: h('telefono') ?? h('teléfono') ?? h('tel') ?? null,
      phone2: h('movil') ?? h('móvil') ?? h('cel') ?? null,
      email: h('mail') ?? h('e-mail') ?? h('email') ?? null,
      commercial_classification:
        h('oro') ?? h('calificac') ?? h('clasificac') ?? null,
      branch: h('unidad') ?? h('sucursal') ?? h('branch') ?? null,
      notes: null,
      notes2: null,
      notes3: null,
    };
  }

  return {
    branch: h('unidad') ?? h('sucursal') ?? h('branch') ?? null,
    employee_name: h('nombre') ?? null,
    username: h('usuario') ?? h('user') ?? null,
  };
}

// ─── Column Picker ────────────────────────────────────────────────────────────

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
              {headers.map((h) => (
                <Pressable
                  key={h}
                  style={pickerStyles.option}
                  onPress={() => {
                    onChange(h);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      pickerStyles.optionText,
                      value === h && pickerStyles.optionSelected,
                    ]}
                  >
                    {h}
                  </Text>
                  {value === h && (
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
  labelCol: { flex: 1, gap: 2 },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  required: { color: colors.error },
  hint: { fontSize: fontSize.xs, color: colors.textDisabled },
  trigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 40,
    gap: spacing[2],
  },
  triggerText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    flex: 1,
  },
  triggerPlaceholder: { color: colors.textDisabled },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  dropdown: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 480,
    padding: spacing[3],
    gap: spacing[2],
  },
  dropdownTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.md,
  },
  optionText: { fontSize: fontSize.base, color: colors.textPrimary, flex: 1 },
  optionSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ImportWizardScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<Step>('upload');
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [classificationTruthyValue, setClassificationTruthyValue] = useState<string>('');
  const [updateExisting, setUpdateExisting] = useState(false);

  // Preview
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState<Record<string, string | null>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [toImport, setToImport] = useState(0);
  const [toSkip, setToSkip] = useState(0);
  const [branchesToCreate, setBranchesToCreate] = useState<string[]>([]);
  const [collaboratorsToInvite, setCollaboratorsToInvite] = useState<
    { branch: string | null; employee_name: string | null; email: string }[]
  >([]);

  // Import progress
  const [progress, setProgress] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  // Done
  const [resultImported, setResultImported] = useState(0);
  const [resultSkipped, setResultSkipped] = useState(0);
  const [resultErrors, setResultErrors] = useState(0);
  const [resultInvited, setResultInvited] = useState(0);

  const isAdmin =
    profile?.role === 'admin' || profile?.role === 'root';

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
      const wb = XLSX.read(data, { type: 'array', cellDates: true });
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

  // ── Client row builder ─────────────────────────────────────────────────────

  function buildClientRow(r: Record<string, unknown>, m: ClientMapping) {
    const ph = m.phone ? phone(r[m.phone]) : null;
    const ph2 = m.phone2 ? phone(r[m.phone2]) : null;
    const em = m.email ? str(r[m.email])?.toLowerCase() ?? null : null;

    const contacts: { name?: string; phone?: string; email?: string }[] = [];
    if (ph) contacts.push({ name: 'Teléfono', phone: ph });
    if (ph2) contacts.push({ name: 'Móvil', phone: ph2 });
    if (em) contacts.push({ email: em });

    const rawClass = m.commercial_classification
      ? str(r[m.commercial_classification])
      : null;
    const commercial_classification = rawClass
      ? classificationTruthyValue.trim()
        ? rawClass.toLowerCase() === classificationTruthyValue.trim().toLowerCase()
          ? 'Oro'
          : null
        : rawClass
      : null;

    const noteParts = [
      m.notes ? str(r[m.notes]) : null,
      m.notes2 ? str(r[m.notes2]) : null,
      m.notes3 ? str(r[m.notes3]) : null,
    ].filter(Boolean);
    const notes = noteParts.length > 0 ? noteParts.join('\n') : null;

    return { contacts, commercial_classification, notes };
  }

  // ── Step: upload → map ─────────────────────────────────────────────────────

  function goToMap() {
    if (!parsed || !importType) return;
    setMapping(autoDetectMapping(parsed.headers, importType));
    setStep('map');
  }

  // ── Step: map → preview ────────────────────────────────────────────────────

  async function goToPreview() {
    if (!parsed || !mapping) return;
    setPreviewLoading(true);
    setStep('preview');

    const companyId = profile?.company_id;
    if (!companyId) return;

    if (importType === 'clientes') {
      const m = mapping as ClientMapping;

      // Build mapped rows
      const mapped = parsed.rows.map((r) => {
        const { contacts, commercial_classification, notes } = buildClientRow(r, m);
        return {
          name: str(m.name ? r[m.name] : null),
          cuit: m.cuit ? documento(r[m.cuit]) : null,
          address: m.address ? str(r[m.address]) : null,
          city: m.city ? str(r[m.city]) : null,
          contacts,
          commercial_classification,
          notes,
          branch: m.branch ? str(r[m.branch]) : null,
        };
      });

      const valid = mapped.filter((r) => r.name);
      setTotalRows(valid.length);

      // Fetch existing CUITs for dedup
      const cuits = valid.map((r) => r.cuit).filter(Boolean) as string[];
      let existingCuits = new Set<string>();
      if (cuits.length > 0) {
        const { data } = await supabase
          .from('clients')
          .select('cuit')
          .eq('company_id', companyId)
          .in('cuit', cuits);
        existingCuits = new Set((data ?? []).map((d) => d.cuit).filter(Boolean));
      }

      const newRows = valid.filter((r) => !r.cuit || !existingCuits.has(r.cuit));
      const existingRows = valid.filter((r) => r.cuit && existingCuits.has(r.cuit));
      setToImport(newRows.length + (updateExisting ? existingRows.length : 0));
      setToSkip(updateExisting ? 0 : existingRows.length);
      setPreviewRows(
        valid.slice(0, 5).map((r) => ({
          Nombre: r.name,
          CUIT: r.cuit,
          Localidad: r.city,
          Teléfonos: r.contacts.filter((c) => c.phone).map((c) => c.phone).join(' / ') || null,
          Calificación: r.commercial_classification,
          UN: r.branch,
        }))
      );
    } else {
      // Colaboradores
      const m = mapping as EmployeeMapping;

      const mapped = parsed.rows.map((r) => ({
        branch: m.branch ? str(r[m.branch]) : null,
        employee_name: m.employee_name ? str(r[m.employee_name]) : null,
        username: m.username ? str(r[m.username]) : null,
      }));

      const uniqueBranches = [
        ...new Set(mapped.map((r) => r.branch).filter(Boolean) as string[]),
      ].sort();

      // Check existing branches
      const { data: existingBranches } = await supabase
        .from('branches')
        .select('name')
        .eq('company_id', companyId);
      const existingNames = new Set(
        (existingBranches ?? []).map((b) => b.name.toLowerCase().trim())
      );
      const newBranches = uniqueBranches.filter(
        (b) => !existingNames.has(b.toLowerCase().trim())
      );

      const toInviteList = mapped
        .filter((r) => r.username)
        .map((r) => ({
          branch: r.branch,
          employee_name: r.employee_name,
          email: `${r.username}@${EMAIL_DOMAIN}`,
        }));

      setBranchesToCreate(newBranches);
      setCollaboratorsToInvite(toInviteList);
      setTotalRows(parsed.rows.length);
      setToImport(newBranches.length + toInviteList.length);
      setToSkip(uniqueBranches.length - newBranches.length);

      setPreviewRows(
        mapped.slice(0, 5).map((r) => ({
          Sucursal: r.branch,
          Colaborador: r.employee_name,
          Email: r.username ? `${r.username}@${EMAIL_DOMAIN}` : null,
        }))
      );
    }

    setPreviewLoading(false);
  }

  // ── Step: preview → importing ──────────────────────────────────────────────

  async function runImport() {
    if (!parsed || !mapping || !profile?.company_id || !user?.id) return;

    setStep('importing');
    const companyId = profile.company_id;
    const userId = user.id;
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    if (importType === 'clientes') {
      const m = mapping as ClientMapping;

      // Fetch branches for name→id resolution
      const { data: branchRows } = await supabase
        .from('branches')
        .select('id, name')
        .eq('company_id', companyId);
      const branchMap = new Map<string, string>(
        (branchRows ?? []).map((b) => [b.name.toLowerCase().trim(), b.id])
      );

      const mapped = parsed.rows
        .map((r) => {
          const { contacts, commercial_classification, notes } = buildClientRow(r, m);
          return {
            owner_user_id: userId,
            company_id: companyId,
            name: str(m.name ? r[m.name] : null),
            cuit: m.cuit ? documento(r[m.cuit]) : null,
            address: m.address ? str(r[m.address]) : null,
            city: m.city ? str(r[m.city]) : null,
            contacts,
            commercial_classification,
            notes,
            branch_name: m.branch ? str(r[m.branch]) : null,
          };
        })
        .filter((r) => r.name);

      // Re-fetch existing CUITs with IDs
      const cuits = mapped.map((r) => r.cuit).filter(Boolean) as string[];
      let existingMap = new Map<string, string>(); // cuit → id
      if (cuits.length > 0) {
        const { data } = await supabase
          .from('clients')
          .select('id, cuit')
          .eq('company_id', companyId)
          .in('cuit', cuits);
        existingMap = new Map(
          (data ?? []).filter((d) => d.cuit).map((d) => [d.cuit, d.id])
        );
      }

      const toInsert = mapped
        .filter((r) => !r.cuit || !existingMap.has(r.cuit))
        .map(({ branch_name, ...rest }) => ({
          ...rest,
          branch_id: branch_name
            ? (branchMap.get(branch_name.toLowerCase().trim()) ?? null)
            : null,
        }));

      const toUpdate = updateExisting
        ? mapped
            .filter((r) => r.cuit && existingMap.has(r.cuit))
            .map(({ branch_name, owner_user_id, company_id: _cid, ...rest }) => ({
              id: existingMap.get(rest.cuit!)!,
              ...rest,
              branch_id: branch_name
                ? (branchMap.get(branch_name.toLowerCase().trim()) ?? null)
                : null,
            }))
        : [];

      setProgressTotal(toInsert.length + toUpdate.length);
      const BATCH = 100;

      // Insert new
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH);
        const { error } = await supabase.from('clients').insert(batch);
        if (error) errors += batch.length;
        else imported += batch.length;
        setProgress(imported + errors);
      }

      // Update existing (one by one — patch by id)
      for (const row of toUpdate) {
        const { id, ...fields } = row;
        const { error } = await supabase
          .from('clients')
          .update(fields)
          .eq('id', id)
          .eq('company_id', companyId);
        if (error) errors++;
        else imported++;
        setProgress(imported + errors);
      }

      skipped = updateExisting ? 0 : mapped.length - toInsert.length;
    } else {
      // Colaboradores — create branches + send invitations
      setProgressTotal(branchesToCreate.length + collaboratorsToInvite.length);

      // Step 1: create new branches
      for (const name of branchesToCreate) {
        const { error } = await supabase
          .from('branches')
          .insert({ company_id: companyId, name });
        if (error) errors++;
        else imported++;
        setProgress(imported + errors);
      }

      // Step 2: fetch updated branch list for name→id mapping
      const { data: allBranches } = await supabase
        .from('branches')
        .select('id, name')
        .eq('company_id', companyId);
      const branchMap = new Map<string, string>(
        (allBranches ?? []).map((b) => [b.name.toLowerCase().trim(), b.id])
      );

      // Step 3: invite each colaborador
      let invited = 0;
      const redirectTo =
        typeof window !== 'undefined' ? window.location.origin + '/' : Linking.createURL('/');

      for (const c of collaboratorsToInvite) {
        const { error } = await supabase.functions.invoke('invite-user', {
          body: { email: c.email, role: 'user', redirectTo },
        });
        if (error) errors++;
        else invited++;
        setProgress(imported + invited + errors);
      }

      // Step 4: assign branches to invited colaboradores
      if (invited > 0) {
        const { data: freshUserData } = await supabase.functions.invoke('list-users');
        const emailToId = new Map<string, string>(
          ((freshUserData as { id: string; email: string }[]) ?? []).map(
            (u) => [u.email, u.id]
          )
        );
        for (const c of collaboratorsToInvite) {
          const branchId = c.branch
            ? (branchMap.get(c.branch.toLowerCase().trim()) ?? null)
            : null;
          const uid = emailToId.get(c.email);
          if (uid && branchId) {
            await supabase.from('profiles').update({ branch_id: branchId }).eq('id', uid);
          }
        }
      }

      setResultInvited(invited);
      skipped = toSkip;
    }

    setResultImported(imported);
    setResultSkipped(skipped);
    setResultErrors(errors);
    setStep('done');
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function isMappingValid(): boolean {
    if (!mapping) return false;
    if (importType === 'clientes') {
      return !!(mapping as ClientMapping).name;
    }
    return !!(mapping as EmployeeMapping).branch;
  }

  // ── Guard: non-admin or non-web ────────────────────────────────────────────

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons
          name="monitor"
          size={40}
          color={colors.textDisabled}
        />
        <Text style={styles.guardText}>
          El importador solo está disponible en la versión web.
        </Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons
          name="lock-outline"
          size={40}
          color={colors.textDisabled}
        />
        <Text style={styles.guardText}>Solo disponible para administradores.</Text>
      </View>
    );
  }

  // ── Step renders ───────────────────────────────────────────────────────────

  function renderUpload() {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>1 · Subir archivo y elegir tipo</Text>

        {/* File picker */}
        <View style={styles.card}>
          <Text style={styles.label}>Archivo Excel (.xlsx)</Text>
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
              {parsed.rows.length} filas · {parsed.headers.length} columnas
              detectadas
            </Text>
          )}
        </View>

        {/* Type selector */}
        <View style={styles.card}>
          <Text style={styles.label}>¿Qué vas a importar?</Text>
          <View style={styles.typeRow}>
            {(
              [
                {
                  type: 'clientes',
                  label: 'Clientes',
                  icon: 'account-group-outline',
                  desc: 'Nombre, CUIT, contacto…',
                },
                {
                  type: 'empleados',
                  label: 'Colaboradores / Sucursales',
                  icon: 'store-outline',
                  desc: 'Crea sucursales e invita colaboradores',
                },
              ] as const
            ).map((opt) => (
              <Pressable
                key={opt.type}
                style={[
                  styles.typeCard,
                  importType === opt.type && styles.typeCardActive,
                ]}
                onPress={() => setImportType(opt.type)}
              >
                <MaterialCommunityIcons
                  name={opt.icon}
                  size={28}
                  color={
                    importType === opt.type
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.typeLabel,
                    importType === opt.type && styles.typeLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={styles.typeDesc}>{opt.desc}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          style={[
            styles.btn,
            (!parsed || !importType) && styles.btnDisabled,
          ]}
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
      importType === 'clientes' ? CLIENT_FIELDS : EMPLOYEE_FIELDS;

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
                setMapping((prev) =>
                  prev ? { ...prev, [field.key]: v } : prev
                )
              }
            />
          ))}
        </View>

        {importType === 'clientes' && (mapping as ClientMapping).commercial_classification && (
          <View style={styles.card}>
            <Text style={styles.label}>Calificación → "Oro"</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>
              ¿Qué valor en la columna{' '}
              <Text style={{ fontWeight: fontWeight.semibold }}>
                {(mapping as ClientMapping).commercial_classification}
              </Text>{' '}
              equivale a "Oro"? Cualquier otro valor se descartará.
            </Text>
            <TextInput
              style={styles.classificationInput}
              value={classificationTruthyValue}
              onChangeText={setClassificationTruthyValue}
              placeholder="ej: S, Oro, 1, true"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="none"
            />
            {!classificationTruthyValue.trim() && (
              <Text style={{ fontSize: fontSize.xs, color: colors.warning }}>
                Sin valor configurado, se importará el texto tal cual.
              </Text>
            )}
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

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalRows}</Text>
            <Text style={styles.statLabel}>Total filas</Text>
          </View>
          {importType === 'clientes' ? (
            <>
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
                <Text style={styles.statLabel}>Ya existen</Text>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.statCard, styles.statCardSuccess]}>
                <Text style={[styles.statNumber, { color: colors.success }]}>
                  {branchesToCreate.length}
                </Text>
                <Text style={styles.statLabel}>Sucursales nuevas</Text>
              </View>
              <View style={[styles.statCard, styles.statCardSuccess]}>
                <Text style={[styles.statNumber, { color: colors.success }]}>
                  {collaboratorsToInvite.length}
                </Text>
                <Text style={styles.statLabel}>Invitaciones</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: colors.textSecondary }]}>
                  {toSkip}
                </Text>
                <Text style={styles.statLabel}>Sucursales exist.</Text>
              </View>
            </>
          )}
        </View>

        {/* Branch list for empleados */}
        {importType === 'empleados' && branchesToCreate.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.label}>
              Sucursales a crear ({branchesToCreate.length})
            </Text>
            {branchesToCreate.map((b) => (
              <View key={b} style={styles.branchRow}>
                <MaterialCommunityIcons
                  name="plus-circle-outline"
                  size={16}
                  color={colors.success}
                />
                <Text style={styles.branchName}>{b}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Preview table */}
        {previewRows.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.label}>
              Primeras {previewRows.length} filas
            </Text>
            <ScrollView horizontal>
              <View>
                {/* Header */}
                <View style={styles.tableRow}>
                  {previewCols.map((col) => (
                    <Text key={col} style={styles.tableHeader}>
                      {col}
                    </Text>
                  ))}
                </View>
                {/* Rows */}
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

        {importType === 'empleados' && collaboratorsToInvite.length > 0 && (
          <View style={[styles.card, styles.infoBox]}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color={colors.primary}
            />
            <Text style={styles.infoText}>
              Se enviará una invitación a cada colaborador con usuario mapeado al email{' '}
              <Text style={{ fontWeight: fontWeight.semibold }}>
                usuario@{EMAIL_DOMAIN}
              </Text>
              . El colaborador recibirá el email para crear su contraseña.
            </Text>
          </View>
        )}

        {importType === 'clientes' && toSkip > 0 && (
          <Pressable
            style={[styles.card, styles.toggleRow]}
            onPress={() => {
              setUpdateExisting((v) => !v);
              setToImport((prev) =>
                updateExisting ? prev - toSkip : prev + toSkip
              );
              setToSkip((prev) => (updateExisting ? toSkip : 0));
            }}
          >
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Actualizar clientes existentes</Text>
              <Text style={styles.toggleDesc}>
                {toSkip} clientes ya existen en la DB.{' '}
                {updateExisting ? 'Se actualizarán sus datos.' : 'Se saltearán.'}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={updateExisting ? 'toggle-switch' : 'toggle-switch-off-outline'}
              size={32}
              color={updateExisting ? colors.primary : colors.textDisabled}
            />
          </Pressable>
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
            style={[
              styles.btn,
              styles.btnFlex,
              toImport === 0 && styles.btnDisabled,
            ]}
            onPress={runImport}
            disabled={toImport === 0}
          >
            <Text style={styles.btnText}>
              {importType === 'clientes'
                ? `Importar ${toImport} clientes →`
                : `Importar →`}
            </Text>
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
          {importType === 'clientes' ? (
            <>
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
            </>
          ) : (
            <>
              <View style={[styles.statCard, styles.statCardSuccess]}>
                <Text style={[styles.statNumber, { color: colors.success }]}>
                  {resultImported}
                </Text>
                <Text style={styles.statLabel}>Sucursales creadas</Text>
              </View>
              <View style={[styles.statCard, styles.statCardSuccess]}>
                <Text style={[styles.statNumber, { color: colors.success }]}>
                  {resultInvited}
                </Text>
                <Text style={styles.statLabel}>Invitaciones enviadas</Text>
              </View>
            </>
          )}
          {resultErrors > 0 && (
            <View style={[styles.statCard, { borderColor: colors.error }]}>
              <Text style={[styles.statNumber, { color: colors.error }]}>
                {resultErrors}
              </Text>
              <Text style={styles.statLabel}>Errores</Text>
            </View>
          )}
        </View>

        <Pressable style={[styles.btn, { marginTop: spacing[4] }]} onPress={() => router.back()}>
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
  content: { padding: spacing[4], paddingBottom: spacing[12], gap: spacing[4], maxWidth: 720, alignSelf: 'center', width: '100%' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[8], gap: spacing[3] },
  guardText: { fontSize: fontSize.base, color: colors.textSecondary, textAlign: 'center', maxWidth: 320 },

  stepContainer: { gap: spacing[4] },
  stepTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.textPrimary },
  stepSubtitle: { fontSize: fontSize.base, color: colors.textSecondary, marginTop: -spacing[2] },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[3],
  },

  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
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

  typeRow: { flexDirection: 'row', gap: spacing[3] },
  typeCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.background,
  },
  typeCardActive: { borderColor: colors.primary, backgroundColor: '#EFF6FF' },
  typeLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary, textAlign: 'center' },
  typeLabelActive: { color: colors.primary },
  typeDesc: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center' },

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
  btnText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textOnPrimary },
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
  statNumber: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.textPrimary },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center' },

  branchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  branchName: { fontSize: fontSize.sm, color: colors.textPrimary },

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

  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], backgroundColor: '#EFF6FF', borderColor: colors.primary },
  infoText: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary, lineHeight: 20 },

  warningBox: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.warningLight, borderColor: colors.warning },
  warningText: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary },

  importingText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  progressTrack: { width: 280, height: 8, backgroundColor: colors.border, borderRadius: borderRadius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: borderRadius.full } as const,

  doneTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.textPrimary },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  toggleInfo: { flex: 1, gap: spacing[1] },
  toggleTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  toggleDesc: { fontSize: fontSize.xs, color: colors.textSecondary },

  classificationInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    minHeight: 44,
  },
});
