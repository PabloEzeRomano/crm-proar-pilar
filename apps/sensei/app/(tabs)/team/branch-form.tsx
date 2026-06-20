import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme';
import { useBranchesStore } from '@/stores/branchesStore';
import { branchSchema } from '@/validators/branch';

export default function BranchFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const branches = useBranchesStore((s) => s.branches);
  const createBranch = useBranchesStore((s) => s.createBranch);
  const updateBranch = useBranchesStore((s) => s.updateBranch);
  const error = useBranchesStore((s) => s.error);

  const existing = isEditing ? branches.find((b) => b.id === id) : null;

  const [name, setName] = useState(existing?.name ?? '');
  const [code, setCode] = useState(existing?.code ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setCode(existing.code ?? '');
      setAddress(existing.address ?? '');
      setCity(existing.city ?? '');
    }
  }, [existing?.id]);

  const handleSave = async () => {
    const result = branchSchema.safeParse({
      name: name.trim(),
      code: code.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
    });

    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }

    setValidationError(null);
    setSaving(true);

    if (isEditing) {
      await updateBranch(id, result.data);
    } else {
      await createBranch(result.data);
    }

    setSaving(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <Text style={styles.label}>Nombre *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nombre de la sucursal"
            placeholderTextColor={colors.textDisabled}
            autoFocus={!isEditing}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Código (sigla)</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="Ej: PL"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Dirección</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Dirección"
            placeholderTextColor={colors.textDisabled}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Ciudad</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Ciudad"
            placeholderTextColor={colors.textDisabled}
          />
        </View>

        {(validationError || error) && (
          <Text style={styles.error}>{validationError || error}</Text>
        )}

        <Pressable
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
          ) : (
            <Text style={styles.buttonText}>
              {isEditing ? 'Guardar cambios' : 'Crear sucursal'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], gap: spacing[4] },
  field: { gap: spacing[1] },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: fontSize.base,
    color: colors.textPrimary,
    minHeight: 48,
  },
  error: { color: colors.error, fontSize: fontSize.sm },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: spacing[2],
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});
