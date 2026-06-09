import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { useClientsStore } from '@/stores/clientsStore';
import { clientSchema } from '@/validators/client';

export default function NewClientScreen() {
  const router = useRouter();
  const createClient = useClientsStore((s) => s.createClient);
  const error = useClientsStore((s) => s.error);

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSave = async () => {
    const result = clientSchema.safeParse({
      name: name.trim(),
      industry: industry.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }

    setValidationError(null);
    setSaving(true);

    const client = await createClient({
      name: result.data.name,
      industry: result.data.industry ?? null,
      address: result.data.address ?? null,
      city: result.data.city ?? null,
      notes: result.data.notes ?? null,
      contacts: [],
    });

    setSaving(false);

    if (client) {
      router.back();
    }
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
            placeholder="Nombre del cliente"
            placeholderTextColor={colors.textDisabled}
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Rubro</Text>
          <TextInput
            style={styles.input}
            value={industry}
            onChangeText={setIndustry}
            placeholder="Industria / rubro"
            placeholderTextColor={colors.textDisabled}
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

        <View style={styles.field}>
          <Text style={styles.label}>Notas</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notas adicionales"
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={3}
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
            <Text style={styles.buttonText}>Crear cliente</Text>
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
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
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
  multiline: { minHeight: 80, textAlignVertical: 'top' },
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
  buttonText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textOnPrimary },
});
