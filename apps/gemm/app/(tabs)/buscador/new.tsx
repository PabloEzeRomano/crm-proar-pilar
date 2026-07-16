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
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useLeadFinderStore } from '@/stores/leadFinderStore';
import { createLeadSearchSchema } from '@/validators/leadFinder';
import {
  colors, fontSize, fontWeight, spacing, borderRadius, shadows,
} from '@/constants/theme';

export default function NewSearchScreen() {
  const router = useRouter();
  const createSearch = useLeadFinderStore((s) => s.createSearch);
  const storeError = useLeadFinderStore((s) => s.error);

  const [query, setQuery] = useState('');
  const [locationText, setLocationText] = useState('');
  const [minRating, setMinRating] = useState('');
  const [minReviews, setMinReviews] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit() {
    setValidationError(null);

    const parsed = createLeadSearchSchema.safeParse({
      query: query.trim(),
      locationText: locationText.trim(),
      minRating: minRating ? parseFloat(minRating) : null,
      minReviews: minReviews ? parseInt(minReviews, 10) : null,
    });

    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Error de validación');
      return;
    }

    setLoading(true);
    const searchId = await createSearch(parsed.data);
    setLoading(false);

    if (searchId) {
      router.replace(`/(tabs)/buscador/${searchId}` as any);
    }
  }

  const error = validationError ?? storeError;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Query */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Categoría / Rubro <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Ej: Peluquería, Panadería, Taller mecánico"
            placeholderTextColor={colors.textDisabled}
            returnKeyType="next"
            autoCapitalize="sentences"
          />
        </View>

        {/* Location */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Ciudad / Zona <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={locationText}
            onChangeText={setLocationText}
            placeholder="Ej: Palermo, Buenos Aires"
            placeholderTextColor={colors.textDisabled}
            returnKeyType="next"
            autoCapitalize="words"
          />
        </View>

        {/* Filters */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Rating mínimo</Text>
            <View style={styles.inputWithIcon}>
              <MaterialCommunityIcons name="star-outline" size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.inputInner}
                value={minRating}
                onChangeText={setMinRating}
                placeholder="Ej: 4.0"
                placeholderTextColor={colors.textDisabled}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Reviews mínimas</Text>
            <View style={styles.inputWithIcon}>
              <MaterialCommunityIcons name="comment-outline" size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.inputInner}
                value={minReviews}
                onChangeText={setMinReviews}
                placeholder="Ej: 20"
                placeholderTextColor={colors.textDisabled}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </View>
          </View>
        </View>

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
          <Text style={styles.infoText}>
            La búsqueda puede tardar 2-3 minutos. Los resultados aparecen progresivamente mientras la IA analiza cada negocio.
          </Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.primaryBtnPressed,
            (loading || !query.trim() || !locationText.trim()) && styles.primaryBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading || !query.trim() || !locationText.trim()}
        >
          {loading ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.textOnPrimary} />
              <Text style={styles.primaryBtnText}>Iniciar búsqueda</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], gap: spacing[4] },

  field: { gap: spacing[1] },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  required: { color: colors.error },

  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    fontSize: fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },

  row: { flexDirection: 'row', gap: spacing[3] },

  inputWithIcon: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surface,
  },
  inputInner: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    height: 52,
  },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primary,
    lineHeight: 20,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.error,
    lineHeight: 20,
  },

  primaryBtn: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    ...shadows.subtle,
  },
  primaryBtnPressed: { opacity: 0.85 },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
