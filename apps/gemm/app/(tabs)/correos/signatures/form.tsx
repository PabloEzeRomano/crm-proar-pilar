import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useEmailStore } from '@/stores/emailStore';
import { showAlert, showConfirm } from '@/lib/dialog';
import { colors, fontSize, fontWeight, spacing, borderRadius } from '@/constants/theme';

function HtmlPreview({ html }: { html: string }) {
  const ref = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && ref.current) {
      (ref.current as unknown as HTMLDivElement).innerHTML = html;
    }
  }, [html]);

  return (
    <View
      ref={ref}
      style={{ minHeight: 40, padding: spacing[2] }}
    />
  );
}

export default function SignatureFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const isEdit = !!id;

  const signatures = useEmailStore((s) => s.signatures);
  const createSignature = useEmailStore((s) => s.createSignature);
  const updateSignature = useEmailStore((s) => s.updateSignature);
  const deleteSignature = useEmailStore((s) => s.deleteSignature);
  const setDefaultSignature = useEmailStore((s) => s.setDefaultSignature);

  const existing = signatures.find((s) => s.id === id);

  const [name, setName] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setBodyHtml(existing.body_html);
      setIsDefault(existing.is_default);
    }
  }, [existing?.id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? 'Editar firma' : 'Nueva firma',
      headerRight: isEdit
        ? () => (
            <Pressable onPress={handleDelete} hitSlop={8} style={{ paddingHorizontal: spacing[3] }}>
              <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.error} />
            </Pressable>
          )
        : undefined,
    });
  }, [isEdit]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Requerido';
    if (!bodyHtml.trim()) errs.body = 'Requerido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    if (isEdit && id) {
      await updateSignature(id, { name: name.trim(), body_html: bodyHtml.trim() });
      if (isDefault && !existing?.is_default) await setDefaultSignature(id);
      router.back();
    } else {
      const created = await createSignature({
        name: name.trim(),
        body_html: bodyHtml.trim(),
        is_default: isDefault,
      });
      if (created) router.back();
    }
    setSaving(false);
  }

  async function handleDelete() {
    const ok = await showConfirm({
      title: 'Eliminar firma',
      message: '¿Eliminar esta firma?',
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok || !id) return;
    await deleteSignature(id);
    router.back();
  }

  async function handleImportFromClipboard() {
    if (Platform.OS === 'web') {
      try {
        const types = await navigator.clipboard.read();
        for (const item of types) {
          if (item.types.includes('text/html')) {
            const blob = await item.getType('text/html');
            const html = await blob.text();
            setBodyHtml(html);
            showAlert('Importado', 'Firma importada desde el portapapeles.');
            return;
          }
        }
        const text = await navigator.clipboard.readText();
        if (text) {
          setBodyHtml(text);
          showAlert('Importado', 'Texto importado (sin formato HTML).');
        }
      } catch {
        showAlert('Error', 'No se pudo leer el portapapeles. Pegá el HTML manualmente.');
      }
    } else {
      showAlert('Pegar HTML', 'Copiá tu firma desde el mail y pegala en el campo de abajo.');
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.field}>
        <Text style={styles.label}>Nombre *</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={name}
          onChangeText={setName}
          placeholder="Ej: Firma principal"
          placeholderTextColor={colors.textDisabled}
        />
        {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}
      </View>

      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Firma (HTML) *</Text>
          <Pressable style={styles.importBtn} onPress={handleImportFromClipboard}>
            <MaterialCommunityIcons name="clipboard-arrow-down-outline" size={16} color={colors.primary} />
            <Text style={styles.importBtnText}>Importar</Text>
          </Pressable>
        </View>
        <TextInput
          style={[styles.input, styles.textArea, errors.body && styles.inputError]}
          value={bodyHtml}
          onChangeText={setBodyHtml}
          multiline
          placeholder={'Pegá tu firma HTML aquí...\n\nEj: <p><b>Juan Pérez</b><br>Ventas - gemm-apps</p>'}
          placeholderTextColor={colors.textDisabled}
          textAlignVertical="top"
        />
        {errors.body ? <Text style={styles.error}>{errors.body}</Text> : null}
      </View>

      {bodyHtml.trim().length > 0 && (
        <View style={styles.previewBox}>
          <Text style={styles.previewTitle}>Vista previa</Text>
          {Platform.OS === 'web' ? (
            <HtmlPreview html={bodyHtml} />
          ) : (
            <Text style={styles.previewText}>
              {bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
            </Text>
          )}
        </View>
      )}

      <View style={styles.defaultRow}>
        <Text style={styles.defaultLabel}>Usar como firma por defecto</Text>
        <Switch
          value={isDefault}
          onValueChange={setIsDefault}
          trackColor={{ true: colors.primary }}
        />
      </View>

      <Pressable
        style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color={colors.textOnPrimary} />
          : <Text style={styles.saveBtnText}>{isEdit ? 'Guardar cambios' : 'Crear firma'}</Text>
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
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  textArea: { height: 200, paddingTop: spacing[3], fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
  },
  importBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },
  previewBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[1],
  },
  previewTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewText: { fontSize: fontSize.sm, color: colors.textPrimary, lineHeight: 20 },
  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  defaultLabel: { fontSize: fontSize.base, color: colors.textPrimary },
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
