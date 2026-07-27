import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setChannel(existing.channel as 'email' | 'whatsapp');
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
    if (channel === 'email' && !subject.trim()) errs.subject = 'Requerido';
    if (!body.trim()) errs.body = 'Requerido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      subject: channel === 'email' ? subject.trim() : '',
      body: body.trim(),
      channel,
    };
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

  const lastFocus = useRef<'subject' | 'body'>('body');
  const cursorPos = useRef({ subject: subject.length, body: body.length });

  function insertVariable(v: string) {
    const field = lastFocus.current;
    const pos = cursorPos.current[field];
    const setter = field === 'subject' ? setSubject : setBody;
    setter((prev) => {
      const clamped = Math.min(pos, prev.length);
      return prev.slice(0, clamped) + v + prev.slice(clamped);
    });
    cursorPos.current[field] = pos + v.length;
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.field}>
        <Text style={styles.label}>Canal</Text>
        <View style={styles.channelRow}>
          <Pressable
            style={[styles.channelBtn, channel === 'email' && styles.channelBtnActive]}
            onPress={() => setChannel('email')}
          >
            <MaterialCommunityIcons name="email-outline" size={16} color={channel === 'email' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.channelBtnText, channel === 'email' && styles.channelBtnTextActive]}>Email</Text>
          </Pressable>
          <Pressable
            style={[styles.channelBtn, channel === 'whatsapp' && styles.channelBtnActiveWa]}
            onPress={() => setChannel('whatsapp')}
          >
            <MaterialCommunityIcons name="whatsapp" size={16} color={channel === 'whatsapp' ? '#25D366' : colors.textSecondary} />
            <Text style={[styles.channelBtnText, channel === 'whatsapp' && styles.channelBtnTextActiveWa]}>WhatsApp</Text>
          </Pressable>
        </View>
      </View>

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

      {channel === 'email' && (
        <View style={styles.field}>
          <Text style={styles.label}>Asunto *</Text>
          <TextInput
            style={[styles.input, errors.subject && styles.inputError]}
            value={subject}
            onChangeText={setSubject}
            onFocus={() => { lastFocus.current = 'subject'; }}
            onSelectionChange={(e) => { cursorPos.current.subject = e.nativeEvent.selection.start; }}
            placeholder="Ej: Propuesta para {{prospectName}}"
            placeholderTextColor={colors.textDisabled}
          />
          {errors.subject ? <Text style={styles.error}>{errors.subject}</Text> : null}
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Cuerpo *</Text>
        <TextInput
          style={[styles.input, styles.textArea, errors.body && styles.inputError]}
          value={body}
          onChangeText={setBody}
          onFocus={() => { lastFocus.current = 'body'; }}
          onSelectionChange={(e) => { cursorPos.current.body = e.nativeEvent.selection.start; }}
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
        <Text style={styles.hintNote}>Toca una variable para insertarla donde está el cursor</Text>
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
  channelRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  channelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  channelBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  channelBtnActiveWa: {
    borderColor: '#25D366',
    backgroundColor: '#25D36615',
  },
  channelBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  channelBtnTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  channelBtnTextActiveWa: {
    color: '#25D366',
    fontWeight: fontWeight.semibold,
  },
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
