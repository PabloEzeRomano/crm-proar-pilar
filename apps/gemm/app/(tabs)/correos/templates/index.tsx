import { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEmailStore } from '@/stores/emailStore';
import { colors, fontSize, fontWeight, spacing, borderRadius, shadows } from '@/constants/theme';

export default function TemplatesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const templates = useEmailStore((s) => s.templates);
  const loading = useEmailStore((s) => s.loading);
  const fetchTemplates = useEmailStore((s) => s.fetchTemplates);

  useEffect(() => { fetchTemplates(); }, []);

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {loading && templates.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[8] }} />
        ) : templates.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="email-edit-outline" size={48} color={colors.textDisabled} />
            <Text style={styles.emptyTitle}>Sin plantillas</Text>
            <Text style={styles.emptySub}>Creá tu primera plantilla para enviar correos rápidos</Text>
          </View>
        ) : (
          templates.map((t) => (
            <Pressable
              key={t.id}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
              onPress={() => router.push({ pathname: '/(tabs)/correos/templates/form', params: { id: t.id } } as any)}
            >
              <View style={[styles.cardIcon, t.channel === 'whatsapp' && styles.cardIconWa]}>
                <MaterialCommunityIcons
                  name={t.channel === 'whatsapp' ? 'whatsapp' : 'email-outline'}
                  size={20}
                  color={t.channel === 'whatsapp' ? '#25D366' : colors.primary}
                />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{t.name}</Text>
                <Text style={styles.cardSubject} numberOfLines={1}>
                  {t.channel === 'whatsapp' ? 'WhatsApp' : t.subject}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textDisabled} />
            </Pressable>
          ))
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + spacing[4] }]}
        onPress={() => router.push('/(tabs)/correos/templates/form' as any)}
        accessibilityRole="button"
        accessibilityLabel="Nueva plantilla"
      >
        <MaterialCommunityIcons name="plus" size={28} color={colors.textOnPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[16] },
  empty: { alignItems: 'center', gap: spacing[3], paddingTop: spacing[12] },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  emptySub: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
    ...shadows.subtle,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconWa: {
    backgroundColor: '#25D36615',
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  cardSubject: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  fab: {
    position: 'absolute',
    right: spacing[4],
    zIndex: 10,
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
});
