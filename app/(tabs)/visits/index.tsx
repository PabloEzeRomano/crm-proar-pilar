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

import React, { useEffect, useLayoutEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useNavigation, useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import TourStep from '@/components/tour/TourStep'

import dayjs from '@/lib/dayjs'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'
import { VisitStatus, VisitType, VisitWithClient } from '@/types'
import { useVisits } from '@/hooks/useVisits'
import { useAuthStore } from '@/stores/authStore'
import { StatusBadge } from '@/components/ui/StatusBadge'
import AppDatePicker from '@/components/ui/AppDatePicker'

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

const STATUS_STRIP_COLOR: Record<VisitStatus, string> = {
  pending: colors.statusPending,
  completed: colors.statusCompleted,
  canceled: colors.statusCanceled,
}

const VISIT_TYPE_LABEL: Record<VisitType, string> = {
  visit: 'Visita',
  call: 'Llamada',
  sale: 'Venta',
  quote: 'Cotización',
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
  const navigation = useNavigation()
  const [activeFilter, setActiveFilter] = useState<VisitStatus | 'all' | 'upcoming'>('all')
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [pendingFrom, setPendingFrom] = useState<Date>(new Date())
  const [pendingTo, setPendingTo] = useState<Date>(new Date())
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showToPicker, setShowToPicker] = useState(false)

  const profile = useAuthStore((state) => state.profile)
  const isAdmin = profile?.role === 'admin'
  const { visits: rawVisits, hasMore, loading, loadingMore, error, fetchVisits, fetchMoreVisits } = useVisits(undefined, activeFilter, isAdmin)

  // Apply date range filter client-side
  const visits = rawVisits.filter((v) => {
    if (!dateFrom && !dateTo) return true
    const scheduled = dayjs(v.scheduled_at)
    if (dateFrom && scheduled.isBefore(dayjs(dateFrom).startOf('day'))) return false
    if (dateTo && scheduled.isAfter(dayjs(dateTo).endOf('day'))) return false
    return true
  })

  const dateRangeActive = Boolean(dateFrom || dateTo)

  useEffect(() => {
    fetchVisits()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Header right: calendar filter button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => {
            setPendingFrom(dateFrom ?? new Date())
            setPendingTo(dateTo ?? new Date())
            setShowToPicker(false)
            setShowDateFilter(true)
            if (Platform.OS === 'android') setShowFromPicker(true)
          }}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Filtrar por fecha"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name={dateRangeActive ? 'calendar-filter' : 'calendar-filter-outline'}
            size={22}
            color={dateRangeActive ? colors.primary : colors.textSecondary}
          />
        </Pressable>
      ),
    })
  }, [navigation, dateRangeActive, dateFrom, dateTo]) // eslint-disable-line react-hooks/exhaustive-deps

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
        hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
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

    // Get owner display name: full_name if available, otherwise email local part
    const ownerDisplay = item.owner?.full_name
      ? item.owner.full_name.split(' ')[0] // First name only
      : item.owner?.email_config?.sender_name || 'Unknown'

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
          <View style={styles.subtitleRow}>
            <Text style={[styles.rowSubtitle, styles.dateTextFlex]} numberOfLines={1}>
              {dateText}
            </Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {VISIT_TYPE_LABEL[item.type ?? 'visit']}
              </Text>
            </View>
            {isAdmin && item.owner && (
              <Text style={styles.ownerIndicator} numberOfLines={1}>
                por {ownerDisplay}
              </Text>
            )}
          </View>
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
      {/* Filter pills — Tour step 7 */}
      <TourStep
        order={7}
        text="Filtrá tus visitas por estado: Pendientes, Completadas o Canceladas. 'Próximas' muestra solo las visitas de hoy en adelante."
        borderRadius={borderRadius.full}
        routePath="/(tabs)/visits"
      >
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {FILTER_OPTIONS.map(renderFilterPill)}
          </ScrollView>
        </View>
      </TourStep>

      {/* Active date range pill */}
      {dateRangeActive && (
        <View style={styles.activeDateRangeBar}>
          <MaterialCommunityIcons name="calendar-range" size={14} color={colors.primary} />
          <Text style={styles.activeDateRangeText}>
            {dateFrom ? dayjs(dateFrom).format('DD/MM') : '…'}
            {' – '}
            {dateTo ? dayjs(dateTo).format('DD/MM') : '…'}
          </Text>
          <Pressable
            onPress={() => { setDateFrom(null); setDateTo(null) }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Quitar filtro de fecha"
          >
            <MaterialCommunityIcons name="close-circle" size={16} color={colors.primary} />
          </Pressable>
        </View>
      )}

      {/* Date range filter modal */}
      <Modal
        visible={showDateFilter}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateFilter(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.dateModalBackdrop} onPress={() => setShowDateFilter(false)} />
        <View style={styles.dateModalSheet}>
          <View style={styles.dateModalHandle} />
          <View style={styles.dateModalHeader}>
            <MaterialCommunityIcons name="calendar-range" size={20} color={colors.primary} />
            <Text style={styles.dateModalTitle}>Filtrar por fecha</Text>
            <Pressable
              onPress={() => setShowDateFilter(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.dateModalContent}>
            {/* From */}
            <View style={styles.dateFieldGroup}>
              <Text style={styles.dateFieldLabel}>Desde</Text>
              {Platform.OS === 'android' ? (
                <Pressable
                  style={({ pressed }) => [styles.dateDisplayButton, pressed && styles.dateDisplayButtonPressed]}
                  onPress={() => setShowFromPicker(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Seleccionar fecha desde"
                >
                  <Text style={styles.dateDisplayText}>{dayjs(pendingFrom).format('DD/MM/YYYY')}</Text>
                  <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
                </Pressable>
              ) : (
                <AppDatePicker
                  value={pendingFrom}
                  mode="date"
                  display="inline"
                  onChange={setPendingFrom}
                  accentColor={colors.primary}
                  locale="es"
                />
              )}
            </View>

            {/* To */}
            <View style={styles.dateFieldGroup}>
              <Text style={styles.dateFieldLabel}>Hasta</Text>
              {Platform.OS === 'android' ? (
                <Pressable
                  style={({ pressed }) => [styles.dateDisplayButton, pressed && styles.dateDisplayButtonPressed]}
                  onPress={() => setShowToPicker(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Seleccionar fecha hasta"
                >
                  <Text style={styles.dateDisplayText}>{dayjs(pendingTo).format('DD/MM/YYYY')}</Text>
                  <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
                </Pressable>
              ) : (
                <AppDatePicker
                  value={pendingTo}
                  mode="date"
                  display="inline"
                  onChange={setPendingTo}
                  accentColor={colors.primary}
                  locale="es"
                />
              )}
            </View>
          </View>

          {/* Android date pickers — rendered as modal dialogs, one at a time */}
          {Platform.OS === 'android' && showFromPicker && (
            <AppDatePicker
              value={pendingFrom}
              mode="date"
              display="calendar"
              onChange={(date) => { setPendingFrom(date); setShowFromPicker(false); setShowToPicker(true) }}
              isAndroidModal
              onDismiss={() => setShowFromPicker(false)}
              accentColor={colors.primary}
              locale="es"
            />
          )}
          {Platform.OS === 'android' && showToPicker && (
            <AppDatePicker
              value={pendingTo}
              mode="date"
              display="calendar"
              onChange={(date) => { setPendingTo(date); setShowToPicker(false) }}
              isAndroidModal
              onDismiss={() => setShowToPicker(false)}
              accentColor={colors.primary}
              locale="es"
            />
          )}

          {/* Actions */}
          <View style={styles.dateModalActions}>
            <Pressable
              style={styles.dateModalClearButton}
              onPress={() => {
                setDateFrom(null)
                setDateTo(null)
                setShowDateFilter(false)
              }}
              accessibilityRole="button"
              accessibilityLabel="Quitar filtro"
            >
              <Text style={styles.dateModalClearLabel}>Quitar filtro</Text>
            </Pressable>
            <Pressable
              style={styles.dateModalApplyButton}
              onPress={() => {
                setDateFrom(pendingFrom)
                setDateTo(pendingTo)
                setShowDateFilter(false)
              }}
              accessibilityRole="button"
              accessibilityLabel="Aplicar filtro"
            >
              <Text style={styles.dateModalApplyLabel}>Aplicar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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

      {/* FAB — Tour step 8 */}
      <View style={styles.fabContainer}>
        <TourStep
          order={8}
          text="Tocá + para agendar una nueva visita. Elegí el cliente, la fecha y hora."
          borderRadius={borderRadius.full}
          routePath="/(tabs)/visits"
        >
          <Pressable
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            onPress={handleFabPress}
            accessibilityRole="button"
            accessibilityLabel="Agregar visita"
          >
            <MaterialCommunityIcons name="plus" size={28} color={colors.textOnPrimary} />
          </Pressable>
        </TourStep>
      </View>
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
    paddingVertical: spacing[1],
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
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
    gap: spacing[2],
  },
  rowSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular as '400',
    color: colors.textSecondary,
  },
  dateTextFlex: {
    flex: 1,
  },
  typeBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },
  ownerIndicator: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular as '400',
    color: colors.textSecondary,
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
  emptyError: {
    fontSize: fontSize.base,
    color: colors.error,
  },
  listEmptyContent: {
    flex: 1,
  },

  footerLoader: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },

  // Header button
  headerBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 48,
    justifyContent: 'center',
  },

  // Active date range pill
  activeDateRangeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activeDateRangeText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.primary,
  },

  // Date filter modal
  dateModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dateModalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  dateModalHandle: {
    width: 36,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  dateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateModalTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  dateModalContent: {
    padding: spacing[4],
    gap: spacing[4],
  },
  dateFieldGroup: {
    gap: spacing[2],
  },
  dateFieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },
  dateDisplayButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
  },
  dateDisplayButtonPressed: {
    borderColor: colors.primary,
  },
  dateDisplayText: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  dateModalActions: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[6],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dateModalClearButton: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  dateModalClearLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },
  dateModalApplyButton: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateModalApplyLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textOnPrimary,
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: spacing[6],
    right: spacing[6],
  },
  fab: {
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
