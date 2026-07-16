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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useLeadFinderStore } from '@/stores/leadFinderStore';
import {
  colors, fontSize, fontWeight, spacing, borderRadius, shadows,
} from '@/constants/theme';
import dayjs from '@/lib/dayjs';
import type { LeadSearch, LeadSearchStatus } from '@/types/leadFinder';

const STATUS_LABELS: Record<LeadSearchStatus, string> = {
  pending: 'Iniciando',
  running: 'Buscando',
  done: 'Completado',
  error: 'Error',
};

const STATUS_COLORS: Record<LeadSearchStatus, string> = {
  pending: colors.textDisabled,
  running: colors.warning,
  done: colors.success,
  error: colors.error,
};

function SearchCard({ search }: { search: LeadSearch }) {
  const router = useRouter();
  const isRunning = search.status === 'running' || search.status === 'pending';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/(tabs)/buscador/${search.id}` as any)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardQuery} numberOfLines={1}>
            {search.query}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[search.status] + '20' }]}>
            {isRunning && (
              <ActivityIndicator size={10} color={STATUS_COLORS[search.status]} style={{ marginRight: 4 }} />
            )}
            <Text style={[styles.statusText, { color: STATUS_COLORS[search.status] }]}>
              {STATUS_LABELS[search.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.cardLocation} numberOfLines={1}>
          <MaterialCommunityIcons name="map-marker-outline" size={13} color={colors.textSecondary} />{' '}
          {search.location_text}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="store-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>
            {search.status === 'done'
              ? `${search.total_found} negocios`
              : isRunning
              ? `${search.processed} / ${search.total_found}`
              : `${search.total_found} negocios`}
          </Text>
        </View>
        <Text style={styles.dateText}>{dayjs(search.created_at).format('DD MMM YYYY')}</Text>
      </View>

      {isRunning && search.total_found > 0 && (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min((search.processed / search.total_found) * 100, 100)}%` },
            ]}
          />
        </View>
      )}
    </Pressable>
  );
}

export default function BuscadorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const searches = useLeadFinderStore((s) => s.searches);
  const loading = useLeadFinderStore((s) => s.loadingSearches);
  const fetchSearches = useLeadFinderStore((s) => s.fetchSearches);

  useEffect(() => {
    fetchSearches();
  }, []);

  if (loading && searches.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: 0 }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]}
      >
        {searches.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="magnify" size={56} color={colors.textDisabled} />
            <Text style={styles.emptyTitle}>Sin búsquedas</Text>
            <Text style={styles.emptySub}>
              Creá una búsqueda para descubrir negocios locales en Google Maps y analizarlos con IA.
            </Text>
          </View>
        ) : (
          searches.map((s) => <SearchCard key={s.id} search={s} />)
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + spacing[4] }]}
        onPress={() => router.push('/(tabs)/buscador/new' as any)}
        accessibilityRole="button"
        accessibilityLabel="Nueva búsqueda"
      >
        <MaterialCommunityIcons name="plus" size={28} color={colors.textOnPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { padding: spacing[4], gap: spacing[3] },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
    ...shadows.subtle,
  },
  cardPressed: { opacity: 0.75 },
  cardHeader: { gap: spacing[1] },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  cardQuery: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  cardLocation: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[1],
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  metaText: { fontSize: fontSize.sm, color: colors.textSecondary },
  dateText: { fontSize: fontSize.xs, color: colors.textDisabled },

  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.warning,
    borderRadius: borderRadius.full,
  },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: spacing[3] },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

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
