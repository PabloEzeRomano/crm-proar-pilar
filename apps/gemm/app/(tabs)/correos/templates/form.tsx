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

import { useEmailStore } from '@/stores/emailStore';
import { showConfirm } from '@/lib/dialog';
import {
  colors, fontSize, fontWeight, spacing, borderRadius,
} from '@/constants/theme';

const VARIABLE_HINTS = [
  { key: '{{prospectName}}', desc: 'Nombre de la empresa' },
  { key: '{{contactName}}',  desc: 'Nombre del contacto' },
  { key: '{{senderName}}',   desc: 'Tu nombre' },
];

export default function TemplateFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const isEdit = !!id;

  const templates = useEmailStore((s) => s.templates);
  const createTemplate = useEmailStore((s) => s.createTemplate);
  const updateTemplate = useEmailStore((s) => s.updateTemplate);
  const deleteTemplate = useEmailStore((s) => s.deleteTemplate);

  const existing = templates.find((t) => t.id === id);

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setSubject(existing.subject);
      setBody(existing.body);
    }
  }, [existing?.id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? 'Editar plantilla' : 'Nueva plantilla',
      headerRight: isEdit
        ? () => (
            <Pressable onPress={handleDelete} hitSlop={8} style={{ paddingHorizontal: spacing[3] }}>
              <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.error} />
            </Pressable>
          )
        : undefined,
    });
  }, [isEdit, name]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Requerido';
    if (!subject.trim()) errs.subject = 'Requerido';
    if (!body.trim()) errs.body = 'Requerido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const payload = { name: name.trim(), subject: subject.trim(), body: body.trim() };
    if (isEdit && id) {
      await updateTemplate(id, payload);
      router.back();
    } else {
      const created = await createTemplate(payload);
      if (created) router.back();
    }
    setSaving(false);
  }

  async function handleDelete() {
    const ok = await showConfirm({
      title: 'Eliminar plantilla',
      message: '¿Eliminar esta plantilla?',
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok || !id) return;
    await deleteTemplate(id);
    router.back();
  }

  function insertVariable(v: string) {
    setBody((prev) => prev + v);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.field}>
        <Text style={styles.label}>Nombre de la plantilla *</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={name}
          onChangeText={setName}
          placeholder="Ej: Seguimiento inicial"
          placeholderTextColor={colors.textDisabled}
        />
        {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Asunto *</Text>
        <TextInput
          style={[styles.input, errors.subject && styles.inputError]}
          value={subject}
          onChangeText={setSubject}
          placeholder="Ej: Propuesta para {{prospectName}}"
          placeholderTextColor={colors.textDisabled}
        />
        {errors.subject ? <Text style={styles.error}>{errors.subject}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Cuerpo *</Text>
        <TextInput
          style={[styles.input, styles.textArea, errors.body && styles.inputError]}
          value={body}
          onChangeText={setBody}
          multiline
          placeholder="Hola {{contactName}}, me comunico de parte de gemm-apps..."
          placeholderTextColor={colors.textDisabled}
          textAlignVertical="top"
        />
        {errors.body ? <Text style={styles.error}>{errors.body}</Text> : null}
      </View>

      {/* Variable hints */}
      <View style={styles.hintBox}>
        <Text style={styles.hintTitle}>Variables disponibles</Text>
        {VARIABLE_HINTS.map((h) => (
          <Pressable key={h.key} style={styles.hintRow} onPress={() => insertVariable(h.key)}>
            <Text style={styles.hintKey}>{h.key}</Text>
            <Text style={styles.hintDesc}>{h.desc}</Text>
            <MaterialCommunityIcons name="plus-circle-outline" size={16} color={colors.primary} />
          </Pressable>
        ))}
        <Text style={styles.hintNote}>Toca una variable para insertarla en el cuerpo</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color={colors.textOnPrimary} />
          : <Text style={styles.saveBtnText}>{isEdit ? 'Guardar cambios' : 'Crear plantilla'}</Text>
        }
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[8] },
  field: { gap: spacing[1] },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  error: { fontSize: fontSize.xs, color: colors.error },
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
  textArea: { height: 200, paddingTop: spacing[3] },
  hintBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[2],
  },
  hintTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  hintKey: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary, flex: 1 },
  hintDesc: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  hintNote: { fontSize: fontSize.xs, color: colors.textDisabled, marginTop: spacing[1] },
  saveBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  saveBtnText: { color: colors.textOnPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold },
});
