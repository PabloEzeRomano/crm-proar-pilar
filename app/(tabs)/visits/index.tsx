/**
 * app/(tabs)/visits/index.tsx — Visits list with status filter
 *
 * Story 5.3 — EP-005
 *
 * Features:
 *   - Fetches visits on mount via useVisits hook
 *   - Horizontal scrollable status filter pills: Todas | Pendientes | Completadas | Canceladas
 *   - FlatList of visit rows (min 64px) with status strip, client name, date, StatusBadge
 *   - Empty state and loading indicator
 *   - FAB (+) to navigate to create form
 */

import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { StatusBadge, STATUS_CONFIG } from '@/components/ui/StatusBadge'

import { useVisits } from '@/hooks/useVisits'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'
import { VisitStatus, VisitWithClient } from '@/types'
import dayjs from '@/lib/dayjs'

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

const STATUS_STRIP_COLOR: Record<VisitStatus, string> = {
  pending: colors.statusPending,
  completed: colors.statusCompleted,
  canceled: colors.statusCanceled,
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

]}>
      <MaterialCommunityIcons name={config.icon} size={14} color={config.text} />
      <Text style={[sbStyles.label, { color: config.text }]}>{config.label}</Text>
    </View>
  )
}



// ---------------------------------------------------------------------------
// Filter tab definitions
// ---------------------------------------------------------------------------

type FilterOption = { key: VisitStatus | 'all' | 'upcoming'; label: string }

const FILTER_OPTIONS: FilterOption[] = [
  { key: 'all', label: 'Todas' },
  { key: 'upcoming', label: 'Próximas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'completed', label: 'Completadas' },
  { key: 'canceled', label: 'Canceladas' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VisitsIndexScreen() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<VisitStatus | 'all' | 'upcoming'>('all')
  const { visits, hasMore, loading, loadingMore, error, fetchVisits, fetchMoreVisits } = useVisits(undefined, activeFilter)

  useEffect(() => {
    fetchVisits()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleRowPress(visit: VisitWithClient) {
    router.push(`/visits/${visit.id}`)
  }

  function handleFabPress() {
    router.push('/visits/form')
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function renderFilterPill({ key, label }: FilterOption) {
    const isActive = key === activeFilter
    return (
      <Pressable
        key={key}
        style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive]}
        onPress={() => setActiveFilter(key)}
        accessibilityRole="button"
        accessibilityLabel={`Filtrar por ${label}`}
        accessibilityState={{ selected: isActive }}
      >
        <Text style={[styles.pillText, isActive ? styles.pillTextActive : styles.pillTextInactive]}>
          {label}
        </Text>
      </Pressable>
    )
  }

  function renderItem({ item }: { item: VisitWithClient }) {
    const clientName = item.client?.name ?? 'Cliente desconocido'
    const dateText = formatVisitDate(item.scheduled_at)

    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => handleRowPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`Ver visita a ${clientName}`}
      >
        {/* Status strip — 4px wide, full height, left side */}
        <View
          style={[
            styles.statusStrip,
            { backgroundColor: STATUS_STRIP_COLOR[item.status] },
          ]}
        />

        {/* Row content */}
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {clientName}
          </Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {dateText}
          </Text>
        </View>

        {/* Status badge */}
        <StatusBadge status={item.status} />
      </Pressable>
    )
  }

  function renderSeparator() {
    return <View style={styles.divider} />
  }

  function renderEmpty() {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )
    }
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyError}>{error}</Text>
        </View>
      )
    }
    if (true) return null  // Original: return null
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay visitas</Text>
      </View>
    )
  }

  // -------------------------------------------------------------------------
  // Root render
  // -------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      {/* Filter pills */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_OPTIONS.map(renderFilterPill)}
        </ScrollView>
      </View>

      {/* Loading state */}
      {loading && visits.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={renderSeparator}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={visits.length === 0 ? styles.listEmptyContent : undefined}
          onEndReached={() => { if (hasMore && !loadingMore) fetchMoreVisits() }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore
              ? () => (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                )
              : null
          }
        />
      )}

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={handleFabPress}
        accessibilityRole="button"
        accessibilityLabel="Agregar visita"
      >
        <MaterialCommunityIcons name="plus" size={28} color={colors.textOnPrimary} />
      </Pressable>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Date formatting helper
// ---------------------------------------------------------------------------

function formatVisitDate(scheduledAt: string): string {
  return dayjs(scheduledAt).format('ddd D MMM · HH:mm')
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // Filter pills
  filterWrapper: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterScroll: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  pill: {
    height: 48,
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
  },
  pillTextActive: {
    color: colors.textOnPrimary,
  },
  pillTextInactive: {
    color: colors.textSecondary,
  },

  // Visit rows — min 64px per ListItem spec
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 64,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  statusStrip: {
    width: 4,
  },
  rowContent: {
    flex: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular as '400',
    color: colors.textSecondary,
    marginTop: spacing[1],
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  // States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  listEmptyContent: {
    flex: 1,
  },

  footerLoader: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing[6],
    right: spacing[6],
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabPressed: {
    backgroundColor: colors.primaryDark,
  },
})
