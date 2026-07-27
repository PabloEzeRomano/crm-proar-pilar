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

export default function SignaturesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signatures = useEmailStore((s) => s.signatures);
  const loading = useEmailStore((s) => s.loading);
  const fetchSignatures = useEmailStore((s) => s.fetchSignatures);

  useEffect(() => { fetchSignatures(); }, []);

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {loading && signatures.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[8] }} />
        ) : signatures.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="draw-pen" size={48} color={colors.textDisabled} />
            <Text style={styles.emptyTitle}>Sin firmas</Text>
            <Text style={styles.emptySub}>Creá tu primera firma para incluirla en tus correos</Text>
          </View>
        ) : (
          signatures.map((s) => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
              onPress={() => router.push({ pathname: '/(tabs)/correos/signatures/form', params: { id: s.id } } as any)}
            >
              <View style={styles.cardIcon}>
                <MaterialCommunityIcons name="draw-pen" size={20} color={colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardNameRow}>
                  <Text style={styles.cardName}>{s.name}</Text>
                  {s.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Por defecto</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardPreview} numberOfLines={1}>
                  {s.body_html.replace(/<[^>]*>/g, '').slice(0, 60)}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textDisabled} />
            </Pressable>
          ))
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + spacing[4] }]}
        onPress={() => router.push('/(tabs)/correos/signatures/form' as any)}
        accessibilityRole="button"
        accessibilityLabel="Nueva firma"
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
  cardBody: { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  cardName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  cardPreview: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  defaultBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[1],
    paddingVertical: 1,
  },
  defaultBadgeText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium },
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
