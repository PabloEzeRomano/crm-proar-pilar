import { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchableSelect } from '@crm/core';

import { useProspectsStore } from '@/stores/prospectsStore';
import { STAGE_LABELS, PRODUCT_LABELS, type Prospect, type ProspectStage } from '@/types';
import { colors, stageColors, productColors, fontSize, fontWeight, spacing, borderRadius, shadows } from '@/constants/theme';
import dayjs from '@/lib/dayjs';

// ── Prospect card ─────────────────────────────────────────────────────────────

function ProspectCard({ prospect }: { prospect: Prospect }) {
  const router = useRouter();
  const pc = productColors[prospect.product];
  const hasFollowUp = !!prospect.next_follow_up;
  const isOverdue =
    hasFollowUp && dayjs(prospect.next_follow_up!).isBefore(dayjs(), 'day');

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/(tabs)/prospects/${prospect.id}` as any)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardName} numberOfLines={1}>
          {prospect.name}
        </Text>
        <View style={[styles.productBadge, { backgroundColor: pc.bg }]}>
          <Text style={[styles.productBadgeText, { color: pc.text }]}>
            {PRODUCT_LABELS[prospect.product]}
          </Text>
        </View>
      </View>
      {prospect.contacts?.[0]?.name ? (
        <Text style={styles.cardCompany} numberOfLines={1}>
          {prospect.contacts[0].name}
        </Text>
      ) : null}
      {hasFollowUp ? (
        <View style={styles.followUpRow}>
          <MaterialCommunityIcons
            name="calendar-clock"
            size={12}
            color={isOverdue ? colors.error : colors.textSecondary}
          />
          <Text
            style={[styles.followUpText, isOverdue && styles.followUpOverdue]}
          >
            {dayjs(prospect.next_follow_up!).format('DD MMM')}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ── Kanban column ─────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  prospects,
}: {
  stage: ProspectStage;
  prospects: Prospect[];
}) {
  const sc = stageColors[stage];

  return (
    <View style={styles.column}>
      <View style={[styles.columnHeader, { borderColor: sc.border }]}>
        <View style={[styles.columnDot, { backgroundColor: sc.text }]} />
        <Text style={[styles.columnTitle, { color: sc.text }]}>
          {STAGE_LABELS[stage]}
        </Text>
        <View style={[styles.columnCount, { backgroundColor: sc.bg }]}>
          <Text style={[styles.columnCountText, { color: sc.text }]}>
            {prospects.length}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.columnCards}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {prospects.length === 0 ? (
          <Text style={styles.emptyCol}>Sin prospectos</Text>
        ) : (
          prospects.map((p) => <ProspectCard key={p.id} prospect={p} />)
        )}
      </ScrollView>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

const normalizeRubro = (industry: string | null | undefined): string | null => {
  if (!industry) return null;
  return industry.split('(')[0].trim() || null;
};

export default function PipelineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const prospects = useProspectsStore((s) => s.prospects);
  const loading = useProspectsStore((s) => s.loading);
  const fetchProspects = useProspectsStore((s) => s.fetchProspects);
  const [selectedRubros, setSelectedRubros] = useState<string[]>([]);
  const [selectedSubrubros, setSelectedSubrubros] = useState<string[]>([]);

  useEffect(() => {
    fetchProspects();
  }, []);

  // Only show active stages in kanban (exclude won/lost)
  const activeStages: ProspectStage[] = ['lead', 'contacted', 'proposal', 'negotiation'];
  const closedStages: ProspectStage[] = ['won', 'lost'];
  const kanbanStages = [...activeStages, ...closedStages];

  const rubroOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of prospects) {
      const r = normalizeRubro(p.industry);
      if (r) set.add(r);
    }
    return [...set].sort();
  }, [prospects]);

  // Reset subrubros when rubros change (stale subrubros from a different rubro)
  const handleRubrosChange = (rubros: string[]) => {
    setSelectedRubros(rubros);
    if (rubros.length === 0) setSelectedSubrubros([]);
  };

  const byRubro = useMemo(
    () =>
      selectedRubros.length > 0
        ? prospects.filter((p) => {
            const r = normalizeRubro(p.industry);
            return r !== null && selectedRubros.includes(r);
          })
        : prospects,
    [prospects, selectedRubros]
  );

  const subrubroOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of byRubro) {
      if (p.subindustry) set.add(p.subindustry);
    }
    return [...set].sort();
  }, [byRubro]);

  const filteredProspects = useMemo(
    () =>
      selectedSubrubros.length > 0
        ? byRubro.filter((p) => p.subindustry != null && selectedSubrubros.includes(p.subindustry))
        : byRubro,
    [byRubro, selectedSubrubros]
  );

  const byStage = (stage: ProspectStage) =>
    filteredProspects.filter((p) => p.stage === stage);

  const overdueProspects = prospects.filter(
    (p) =>
      p.next_follow_up &&
      dayjs(p.next_follow_up).isBefore(dayjs(), 'day') &&
      p.stage !== 'won' &&
      p.stage !== 'lost'
  );

  if (loading && prospects.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Rubro + Subrubro filters */}
      {rubroOptions.length > 0 && (
        <View style={styles.filterBar}>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <SearchableSelect
                label="Rubro"
                options={rubroOptions}
                selected={selectedRubros}
                onChange={handleRubrosChange}
                multiple
                placeholder="Filtrar por rubro"
              />
            </View>
            {selectedRubros.length > 0 && subrubroOptions.length > 0 && (
              <View style={styles.filterItem}>
                <SearchableSelect
                  label="Subrubro"
                  options={subrubroOptions}
                  selected={selectedSubrubros}
                  onChange={setSelectedSubrubros}
                  multiple
                  placeholder="Filtrar por subrubro"
                />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Follow-ups vencidos */}
      {overdueProspects.length > 0 && (
        <Pressable
          style={styles.overdueBar}
          onPress={() => router.push('/(tabs)/prospects' as any)}
        >
          <MaterialCommunityIcons name="calendar-alert" size={16} color={colors.error} />
          <Text style={styles.overdueText}>
            {overdueProspects.length} seguimiento{overdueProspects.length > 1 ? 's' : ''} vencido{overdueProspects.length > 1 ? 's' : ''} —{' '}
            {overdueProspects.slice(0, 2).map((p) => p.name).join(', ')}
            {overdueProspects.length > 2 ? ` y ${overdueProspects.length - 2} más` : ''}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={colors.error} />
        </Pressable>
      )}

      {/* FAB */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + spacing[4] }]}
        onPress={() => router.push('/(tabs)/prospects/form' as any)}
        accessibilityRole="button"
        accessibilityLabel="Agregar prospecto"
      >
        <MaterialCommunityIcons name="plus" size={28} color={colors.textOnPrimary} />
      </Pressable>

      {/* Horizontal kanban */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={Platform.OS === 'web'}
        style={styles.boardScroll}
        contentContainerStyle={styles.board}
      >
        {kanbanStages.map((stage) => (
          <KanbanColumn key={stage} stage={stage} prospects={byStage(stage)} />
        ))}
      </ScrollView>
    </View>
  );
}

const COLUMN_WIDTH = 250;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  boardScroll: {
    flex: 1,
  },
  board: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: spacing[3],
    gap: spacing[3],
    flexGrow: 1,
  },
  column: {
    width: COLUMN_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.subtle,
    overflow: 'hidden',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderBottomWidth: 2,
    borderColor: colors.border,
  },
  columnDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  columnTitle: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  columnCount: {
    minWidth: 20,
    height: 20,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[1],
  },
  columnCountText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  columnCards: {
    flex: 1,
    padding: spacing[2],
  },
  emptyCol: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: { opacity: 0.75 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  cardName: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  cardCompany: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing[1],
  },
  productBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
  },
  productBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  followUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing[1],
  },
  followUpText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  followUpOverdue: { color: colors.error },
  overdueBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.errorLight,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  overdueText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.medium,
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
  filterBar: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  filterItem: {
    flex: 1,
  },
});
