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
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [product, setProduct] = useState<ProspectProduct>('crm');
  const [stage, setStage] = useState<ProspectStage>('lead');
  const [notes, setNotes] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState(''); // YYYY-MM-DD HH:MM
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingProspect) {
      setName(existingProspect.name);
      setCompanyName(existingProspect.company_name ?? '');
      setEmail(existingProspect.email ?? '');
      setPhone(existingProspect.phone ?? '');
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
    if (email.trim() && !email.includes('@')) errs.email = 'Email inválido';
    if (nextFollowUp && isNaN(Date.parse(nextFollowUp)))
      errs.nextFollowUp = 'Fecha inválida';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      name: name.trim(),
      company_name: companyName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      product,
      stage,
      notes: notes.trim() || null,
      next_follow_up: nextFollowUp
        ? new Date(nextFollowUp).toISOString()
        : null,
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
      <Field label="Nombre *" error={errors.name}>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={name}
          onChangeText={setName}
          placeholder="Nombre del prospecto"
          placeholderTextColor={colors.textDisabled}
        />
      </Field>

      <Field label="Empresa">
        <TextInput
          style={styles.input}
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Nombre de la empresa"
          placeholderTextColor={colors.textDisabled}
        />
      </Field>

      <Field label="Email" error={errors.email}>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="email@empresa.com"
          placeholderTextColor={colors.textDisabled}
        />
      </Field>

      <Field label="Teléfono">
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+54 11 1234-5678"
          placeholderTextColor={colors.textDisabled}
        />
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
  textArea: {
    height: 100,
    paddingTop: spacing[3],
  },
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
  stageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
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
});
