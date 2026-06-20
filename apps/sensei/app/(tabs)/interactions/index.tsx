import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  interactionResultColors,
  shadows,
  spacing,
} from '@/constants/theme';
import {
  channelIcon,
  contactResultLabel,
  interestResultLabel,
} from '@/constants/labels';
import { useInteractionsStore } from '@/stores/interactionsStore';
import type { ContactResult, InteractionWithClient } from '@/types';

const FILTER_TABS: { key: 'all' | ContactResult; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'contacted', label: 'Contactados' },
  { key: 'not_contacted', label: 'No contactados' },
];

function InteractionRow({
  interaction,
  onPress,
}: {
  interaction: InteractionWithClient;
  onPress: () => void;
}) {
  const resultColor =
    interaction.contact_result === 'contacted'
      ? interactionResultColors.contacted
      : interactionResultColors.not_contacted;

  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={[styles.rowDot, { backgroundColor: resultColor }]} />
      <View style={styles.rowContent}>
        <Text style={styles.rowName} numberOfLines={1}>
          {interaction.client?.name ?? 'Cliente desconocido'}
        </Text>
        <View style={styles.rowMeta}>
          <Text style={[styles.rowResult, { color: resultColor }]}>
            {contactResultLabel[interaction.contact_result]}
          </Text>
          {interaction.interest_result && (
            <Text style={styles.rowInterest}>
              {' · '}
              {interestResultLabel[interaction.interest_result]}
            </Text>
          )}
        </View>
        {interaction.notes && (
          <Text style={styles.rowNotes} numberOfLines={1}>
            {interaction.notes}
          </Text>
        )}
      </View>
      <View style={styles.rowRight}>
        <MaterialCommunityIcons
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- icon name map value isn't narrowed to MCIcons glyph union
          name={channelIcon[interaction.channel] as any}
          size={18}
          color={colors.textSecondary}
        />
        <Text style={styles.rowDate}>
          {new Date(interaction.created_at).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
          })}
        </Text>
      </View>
    </Pressable>
  );
}

export default function GestionesScreen() {
  const router = useRouter();
  const interactions = useInteractionsStore((s) => s.interactions);
  const loading = useInteractionsStore((s) => s.loading);
  const fetchMyInteractions = useInteractionsStore(
    (s) => s.fetchMyInteractions
  );

  const [filterTab, setFilterTab] = useState<'all' | ContactResult>('all');

  useEffect(() => {
    fetchMyInteractions();
  }, []);

  const filtered = useMemo(() => {
    if (filterTab === 'all') return interactions;
    return interactions.filter((i) => i.contact_result === filterTab);
  }, [interactions, filterTab]);

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {FILTER_TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, filterTab === tab.key && styles.tabActive]}
            onPress={() => setFilterTab(tab.key)}
            accessibilityRole="tab"
          >
            <Text
              style={[
                styles.tabText,
                filterTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No hay gestiones registradas</Text>
            </View>
          }
          renderItem={({ item }) => (
            <InteractionRow
              interaction={item}
              onPress={() => router.push(`/clients/${item.client_id}`)}
            />
          )}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/interactions/new')}
        accessibilityRole="button"
        accessibilityLabel="Nueva gestión"
      >
        <MaterialCommunityIcons
          name="plus"
          size={28}
          color={colors.textOnPrimary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  tab: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    minHeight: 36,
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.semibold,
  },
  listContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[20] },
  separator: { height: spacing[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[3],
    ...shadows.subtle,
    minHeight: 56,
  },
  rowDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  rowContent: { flex: 1, gap: 2 },
  rowName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  rowMeta: { flexDirection: 'row', alignItems: 'center' },
  rowResult: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  rowInterest: { fontSize: fontSize.sm, color: colors.textSecondary },
  rowNotes: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  rowRight: { alignItems: 'center', gap: 4 },
  rowDate: { fontSize: fontSize.xs, color: colors.textDisabled },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  emptyText: { fontSize: fontSize.base, color: colors.textSecondary },
  fab: {
    position: 'absolute',
    bottom: spacing[6],
    right: spacing[4],
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.subtle,
  },
});
