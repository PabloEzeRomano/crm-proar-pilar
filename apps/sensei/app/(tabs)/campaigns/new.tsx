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
import { useCampaignsStore } from '@/stores/campaignsStore';
import { campaignSchema } from '@/validators/campaign';

export default function NewCampaignScreen() {
  const router = useRouter();
  const createCampaign = useCampaignsStore((s) => s.createCampaign);
  const error = useCampaignsStore((s) => s.error);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSave = async () => {
    const result = campaignSchema.safeParse({
      name: name.trim(),
      description: description.trim() || undefined,
    });

    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }

    setValidationError(null);
    setSaving(true);

    const campaign = await createCampaign(result.data);
    setSaving(false);

    if (campaign) {
      router.replace(`/campaigns/${campaign.id}`);
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
            placeholder="Nombre de la campaña"
            placeholderTextColor={colors.textDisabled}
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Descripción de la campaña"
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
            <Text style={styles.buttonText}>Crear campaña</Text>
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
