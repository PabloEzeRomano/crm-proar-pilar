import { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useProspectsStore } from '@/stores/prospectsStore';
import {
  STAGE_LABELS,
  PRODUCT_LABELS,
  PIPELINE_STAGES,
  PRODUCTS,
  type ContactInfo,
  type ProspectStage,
  type ProspectProduct,
} from '@/types';
import {
  colors,
  stageColors,
  productColors,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from '@/constants/theme';

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function ContactsEditor({
  contacts,
  onChange,
}: {
  contacts: ContactInfo[];
  onChange: (contacts: ContactInfo[]) => void;
}) {
  function update(index: number, patch: Partial<ContactInfo>) {
    const next = contacts.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange(next);
  }

  function remove(index: number) {
    onChange(contacts.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...contacts, {}]);
  }

  return (
    <View style={styles.contactsWrapper}>
      {contacts.map((c, i) => (
        <View key={i} style={styles.contactCard}>
          <View style={styles.contactHeader}>
            <Text style={styles.contactTitle}>Contacto {i + 1}</Text>
            <Pressable onPress={() => remove(i)} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
          <TextInput
            style={styles.contactInput}
            value={c.name ?? ''}
            onChangeText={(v) => update(i, { name: v || undefined })}
            placeholder="Nombre"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.contactInput}
            value={c.phone ?? ''}
            onChangeText={(v) => update(i, { phone: v || undefined })}
            placeholder="Teléfono"
            placeholderTextColor={colors.textDisabled}
            keyboardType="phone-pad"
          />
          <TextInput
            style={[styles.contactInput, styles.contactInputLast]}
            value={c.email ?? ''}
            onChangeText={(v) => update(i, { email: v || undefined })}
            placeholder="Email"
            placeholderTextColor={colors.textDisabled}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      ))}
      <Pressable style={styles.addContactBtn} onPress={add}>
        <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
        <Text style={styles.addContactText}>Agregar contacto</Text>
      </Pressable>
    </View>
  );
}

export default function ProspectFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const isEdit = !!id;

  const existingProspect = useProspectsStore((s) =>
    id ? s.prospects.find((p) => p.id === id) : undefined
  );
  const createProspect = useProspectsStore((s) => s.createProspect);
  const updateProspect = useProspectsStore((s) => s.updateProspect);

  const [name, setName] = useState('');
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [industry, setIndustry] = useState('');
  const [address, setAddress] = useState('');
  const [zone, setZone] = useState('');
  const [cuit, setCuit] = useState('');
  const [product, setProduct] = useState<ProspectProduct>('crm');
  const [stage, setStage] = useState<ProspectStage>('lead');
  const [notes, setNotes] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingProspect) {
      setName(existingProspect.name);
      setContacts(existingProspect.contacts ?? []);
      setIndustry(existingProspect.industry ?? '');
      setAddress(existingProspect.address ?? '');
      setZone(existingProspect.zone ?? '');
      setCuit(existingProspect.cuit ?? '');
      setProduct(existingProspect.product);
      setStage(existingProspect.stage);
      setNotes(existingProspect.notes ?? '');
      setNextFollowUp(
        existingProspect.next_follow_up
          ? existingProspect.next_follow_up.slice(0, 16)
          : ''
      );
    }
  }, [existingProspect?.id]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Editar prospecto' : 'Nuevo prospecto' });
  }, [isEdit]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'El nombre es requerido';
    if (nextFollowUp && isNaN(Date.parse(nextFollowUp)))
      errs.nextFollowUp = 'Fecha inválida';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);

    const cleanContacts = contacts
      .map((c) => ({
        name: c.name?.trim() || undefined,
        phone: c.phone?.trim() || undefined,
        email: c.email?.trim() || undefined,
      }))
      .filter((c) => c.name || c.phone || c.email);

    const payload = {
      name: name.trim(),
      contacts: cleanContacts,
      industry: industry.trim() || null,
      address: address.trim() || null,
      zone: zone.trim() || null,
      cuit: cuit.trim() || null,
      product,
      stage,
      notes: notes.trim() || null,
      next_follow_up: nextFollowUp ? new Date(nextFollowUp).toISOString() : null,
    };

    if (isEdit && id) {
      await updateProspect(id, payload);
      router.back();
    } else {
      const created = await createProspect(payload);
      if (created) {
        router.replace(`/(tabs)/prospects/${created.id}` as any);
      }
    }
    setSaving(false);
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Field label="Empresa / Prospecto *" error={errors.name}>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={name}
          onChangeText={setName}
          placeholder="Nombre de la empresa"
          placeholderTextColor={colors.textDisabled}
        />
      </Field>

      <Field label="Rubro">
        <TextInput
          style={styles.input}
          value={industry}
          onChangeText={setIndustry}
          placeholder="Ej: Tecnología, Gastronomía..."
          placeholderTextColor={colors.textDisabled}
        />
      </Field>

      <Field label="Dirección">
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Dirección"
          placeholderTextColor={colors.textDisabled}
        />
      </Field>

      <View style={styles.row}>
        <View style={styles.rowHalf}>
          <Field label="Zona">
            <TextInput
              style={styles.input}
              value={zone}
              onChangeText={setZone}
              placeholder="Zona / Región"
              placeholderTextColor={colors.textDisabled}
            />
          </Field>
        </View>
        <View style={styles.rowHalf}>
          <Field label="CUIT">
            <TextInput
              style={styles.input}
              value={cuit}
              onChangeText={setCuit}
              placeholder="20-12345678-9"
              placeholderTextColor={colors.textDisabled}
              keyboardType="numbers-and-punctuation"
            />
          </Field>
        </View>
      </View>

      <Field label="Contactos">
        <ContactsEditor contacts={contacts} onChange={setContacts} />
      </Field>

      <Field label="Producto">
        <View style={styles.chipRow}>
          {PRODUCTS.map((p) => {
            const pc = productColors[p];
            const active = product === p;
            return (
              <Pressable
                key={p}
                style={[styles.chip, active && { backgroundColor: pc.bg, borderColor: pc.text }]}
                onPress={() => setProduct(p)}
              >
                <Text style={[styles.chipText, active && { color: pc.text }]}>
                  {PRODUCT_LABELS[p]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Etapa">
        <View style={styles.stageGrid}>
          {PIPELINE_STAGES.map((s) => {
            const sc = stageColors[s];
            const active = stage === s;
            return (
              <Pressable
                key={s}
                style={[
                  styles.stageChip,
                  active && { backgroundColor: sc.bg, borderColor: sc.border },
                ]}
                onPress={() => setStage(s)}
              >
                <View style={[styles.stageDot, { backgroundColor: active ? sc.text : colors.textDisabled }]} />
                <Text style={[styles.stageChipText, active && { color: sc.text }]}>
                  {STAGE_LABELS[s]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Próximo seguimiento" error={errors.nextFollowUp}>
        <TextInput
          style={[styles.input, errors.nextFollowUp && styles.inputError]}
          value={nextFollowUp}
          onChangeText={setNextFollowUp}
          placeholder="YYYY-MM-DD HH:MM"
          placeholderTextColor={colors.textDisabled}
        />
      </Field>

      <Field label="Notas">
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          placeholder="Observaciones, contexto..."
          placeholderTextColor={colors.textDisabled}
          textAlignVertical="top"
        />
      </Field>

      <Pressable
        style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <>
            <MaterialCommunityIcons name="check" size={18} color={colors.textOnPrimary} />
            <Text style={styles.saveBtnText}>
              {isEdit ? 'Guardar cambios' : 'Crear prospecto'}
            </Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[8] },
  row: { flexDirection: 'row', gap: spacing[3] },
  rowHalf: { flex: 1 },
  field: { gap: spacing[1] },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  fieldError: { fontSize: fontSize.xs, color: colors.error },
  input: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  inputError: { borderColor: colors.error },
  textArea: { height: 100, paddingTop: spacing[3] },
  chipRow: { flexDirection: 'row', gap: spacing[2] },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  stageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  stageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stageDot: { width: 6, height: 6, borderRadius: borderRadius.full },
  stageChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  saveBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  // Contacts editor
  contactsWrapper: { gap: spacing[2] },
  contactCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
  },
  contactTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactInput: {
    height: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing[3],
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  contactInputLast: {},
  addContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
  },
  addContactText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
});
