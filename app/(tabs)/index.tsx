/**
 * app/(tabs)/index.tsx — Today Dashboard
 *
 * Stories 6.4, 6.5, 6.6, 6.7 — EP-006
 *
 * Features:
 *   - 6.4: Today's visit list (Agenda de hoy) with time, client name, industry/city, StatusBadge
 *   - 6.5: Next appointment card — upcoming state with countdown
 *   - 6.6: Next appointment card — overdue state with elapsed time + all-done state
 *   - 6.7: Offline banner when showing cached data (isStale)
 *   - Auto-refresh every 60 seconds while screen is focused
 *   - Gear icon in header navigates to Settings
 *   - Today's date as subtitle in header
 */

import React, { useCallback, useLayoutEffect, useMemo } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect, useNavigation, useRouter } from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'

import { useToday } from '@/hooks/useToday'
import { TodaySpan } from '@/stores/todayStore'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  shadows,
  spacing,
} from '@/constants/theme'
import { VisitStatus, VisitWithClient } from '@/types'
import dayjs from '@/lib/dayjs'

// ---------------------------------------------------------------------------
// Status configuration (same pattern as visits screen)
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    bg: colors.statusPendingLight,
    text: colors.statusPending,
    icon: 'clock-outline' as const,
  },
  completed: {
    label: 'Completada',
    bg: colors.statusCompletedLight,
    text: colors.statusCompleted,
    icon: 'check-circle-outline' as const,
  },
  canceled: {
    label: 'Cancelada',
    bg: colors.statusCanceledLight,
    text: colors.statusCanceled,
    icon: 'close-circle-outline' as const,
  },
} as const

// ---------------------------------------------------------------------------
// StatusBadge (inline — same pattern as visits screen)
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: VisitStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <View style={[sbStyles.container, { backgroundColor: config.bg }]}>
      <MaterialCommunityIcons name={config.icon} size={14} color={config.text} />
      <Text style={[sbStyles.label, { color: config.text }]}>{config.label}</Text>
    </View>
  )
}

const sbStyles = StyleSheet.create({
  container: {
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.full,
    gap: spacing[1],
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
  },
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a minute count into a human-readable string.
 * Uses the absolute value, e.g. -25 → "25 minutos", 90 → "1 h 30 min".
 */
function formatMinutes(mins: number): string {
  const abs = Math.abs(mins)
  if (abs < 60) return `${abs} minuto${abs !== 1 ? 's' : ''}`
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TodayScreen() {
  const router = useRouter()
  const navigation = useNavigation()

  const {
    visits,
    span,
    nextVisit,
    isNextOverdue,
    loading,
    isStale,
    lastFetched,
    fetchTodayVisits,
  } = useToday()

  // ── Auto-refresh while screen is focused ────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      fetchTodayVisits(span)
      const interval = setInterval(() => fetchTodayVisits(span), 60_000)
      return () => clearInterval(interval)
    }, [span]) // eslint-disable-line react-hooks/exhaustive-deps
  )

  // ── Header: gear icon + date subtitle ───────────────────────────────────
  const headerSubtitle = useMemo(() => {
    if (span === 'today') return dayjs().format('dddd D [de] MMMM')
    if (span === 'week') {
      const start = dayjs().startOf('week')
      const end = dayjs().endOf('week')
      return `${start.format('D')} – ${end.format('D [de] MMMM')}`
    }
    return dayjs().format('MMMM YYYY')
  }, [span])

  const sectionTitle = span === 'today' ? 'Agenda de hoy' : span === 'week' ? 'Esta semana' : 'Este mes'

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => router.push('/(tabs)/settings')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.headerGear}
          accessibilityLabel="Configuración"
        >
          <Ionicons name="settings-outline" size={22} color={colors.primary} />
        </Pressable>
      ),
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {span === 'today' ? 'Agenda' : span === 'week' ? 'Esta semana' : 'Este mes'}
          </Text>
          <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
        </View>
      ),
    })
  }, [navigation, router, span, headerSubtitle])

  // ── Next visit card state ────────────────────────────────────────────────
  const cardState: 'loading' | 'done' | 'overdue' | 'upcoming' =
    loading && visits.length === 0
      ? 'loading'
      : nextVisit === null
      ? 'done'
      : isNextOverdue
      ? 'overdue'
      : 'upcoming'

  // Compute fresh display minutes from scheduled_at on every render
  // (so the countdown stays accurate within the 60s refresh cycle)
  const liveMinutesUntilNext = useMemo<number | null>(() => {
    if (!nextVisit) return null
    return dayjs(nextVisit.scheduled_at).diff(dayjs(), 'minute')
  }, [nextVisit]) // eslint-disable-line react-hooks/exhaustive-deps
  // Note: this is intentionally recalculated on each render, not only when
  // nextVisit changes. The dependency on nextVisit is still correct —
  // a new render triggered by the 60s interval will recompute the value.

  // ── Derived strings for next-visit card ─────────────────────────────────
  const nextVisitTimeLabel = useMemo<string>(() => {
    if (!nextVisit) return ''
    return dayjs(nextVisit.scheduled_at).format('HH:mm')
  }, [nextVisit])

  const nextVisitCountdownLabel = useMemo<string>(() => {
    if (liveMinutesUntilNext === null) return ''
    if (liveMinutesUntilNext >= 0) {
      return `en ${formatMinutes(liveMinutesUntilNext)}`
    }
    return `Atrasado por ${formatMinutes(liveMinutesUntilNext)}`
  }, [liveMinutesUntilNext])

  // ── Offline banner last-fetched label ───────────────────────────────────
  const lastFetchedLabel = useMemo<string>(() => {
    if (!lastFetched) return ''
    return ` · ${dayjs(lastFetched).format('HH:mm')}`
  }, [lastFetched])

  // ── Helpers ─────────────────────────────────────────────────────────────

  function handleVisitPress(visit: VisitWithClient) {
    router.push(`/visits/${visit.id}?from=agenda`)
  }

  function handleNextCardPress() {
    if (nextVisit) {
      router.push(`/visits/${nextVisit.id}`)
    }
  }

  function handleNewVisitPress() {
    router.push('/visits/form')
  }

  // ── Render: Next visit card ──────────────────────────────────────────────

  function renderNextCard() {
    if (cardState === 'loading') {
      return (
        <View style={[styles.nextCard, styles.nextCardLoading]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )
    }

    if (cardState === 'done') {
      return (
        <View style={[styles.nextCard, styles.nextCardDone]}>
          <Text style={styles.nextCardDoneEmoji}>✅</Text>
          <Text style={[styles.nextCardDoneTitle, { color: colors.success }]}>
            Todo listo por hoy
          </Text>
          <Text style={styles.nextCardDoneSubtitle}>
            No quedan visitas pendientes
          </Text>
        </View>
      )
    }

    if (cardState === 'overdue') {
      return (
        <Pressable
          style={({ pressed }) => [
            styles.nextCard,
            styles.nextCardOverdue,
            pressed && styles.nextCardPressed,
          ]}
          onPress={handleNextCardPress}
          accessibilityRole="button"
          accessibilityLabel={`Visita atrasada: ${nextVisit?.client.name}`}
        >
          <Text style={[styles.nextCardLabel, { color: colors.warning }]}>
            ⚠️  ATRASADO
          </Text>
          <Text style={styles.nextCardClientName} numberOfLines={1}>
            {nextVisit?.client.name}
          </Text>
          <Text style={[styles.nextCardTime, { color: colors.warning }]}>
            {nextVisitCountdownLabel}
          </Text>
        </Pressable>
      )
    }

    // cardState === 'upcoming'
    return (
      <Pressable
        style={({ pressed }) => [
          styles.nextCard,
          styles.nextCardUpcoming,
          pressed && styles.nextCardPressed,
        ]}
        onPress={handleNextCardPress}
        accessibilityRole="button"
        accessibilityLabel={`Siguiente visita: ${nextVisit?.client.name}`}
      >
        <Text style={[styles.nextCardLabel, { color: colors.textSecondary }]}>
          ⏰  SIGUIENTE
        </Text>
        <Text style={styles.nextCardClientName} numberOfLines={1}>
          {nextVisit?.client.name}
        </Text>
        <Text style={[styles.nextCardTime, { color: colors.textSecondary }]}>
          {nextVisitTimeLabel} · {nextVisitCountdownLabel}
        </Text>
      </Pressable>
    )
  }

  // ── Render: Visit row ────────────────────────────────────────────────────

  function renderVisitRow(visit: VisitWithClient) {
    const scheduledDayjs = dayjs(visit.scheduled_at)
    const timeText = span === 'today'
      ? scheduledDayjs.format('HH:mm')
      : scheduledDayjs.format('ddd D · HH:mm')
    const clientName = visit.client?.name ?? 'Cliente desconocido'

    const subtitleParts: string[] = []
    if (visit.client?.industry) subtitleParts.push(visit.client.industry)
    if (visit.client?.city) subtitleParts.push(visit.client.city)
    const subtitle = subtitleParts.join(' · ')

    const isCompleted = visit.status === 'completed'
    const isCanceled = visit.status === 'canceled'
    const isPendingOverdue =
      visit.status === 'pending' && scheduledDayjs.isBefore(dayjs())

    const rowOpacity = isCompleted ? 0.5 : isCanceled ? 0.4 : 1

    const timeColor = isPendingOverdue ? colors.warning : colors.textPrimary

    return (
      <Pressable
        key={visit.id}
        style={({ pressed }) => [
          styles.visitRow,
          { opacity: rowOpacity },
          pressed && styles.visitRowPressed,
        ]}
        onPress={() => handleVisitPress(visit)}
        accessibilityRole="button"
        accessibilityLabel={`Ver visita a ${clientName}`}
      >
        {/* Left: time column */}
        <View style={styles.visitRowTime}>
          <Text style={[styles.visitTimeText, { color: timeColor }]}>
            {timeText}
          </Text>
        </View>

        {/* Center: client name + subtitle */}
        <View style={styles.visitRowContent}>
          <Text style={styles.visitClientName} numberOfLines={1}>
            {clientName}
          </Text>
          {subtitle.length > 0 && (
            <Text style={styles.visitSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right: status badge */}
        <StatusBadge status={visit.status} />
      </Pressable>
    )
  }

  // ── Render: Empty state ──────────────────────────────────────────────────

  function renderEmptyState() {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📅</Text>
        <Text style={styles.emptyText}>
          {span === 'today'
            ? 'No hay visitas programadas para hoy'
            : span === 'week'
            ? 'No hay visitas esta semana'
            : 'No hay visitas este mes'}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.emptyButton,
            pressed && styles.emptyButtonPressed,
          ]}
          onPress={handleNewVisitPress}
          accessibilityRole="button"
          accessibilityLabel="Nueva visita"
        >
          <Text style={styles.emptyButtonText}>Nueva visita</Text>
        </Pressable>
      </View>
    )
  }

  // ── Root render ──────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Offline banner — story 6.7 */}
      {isStale && (
        <View style={styles.offlineBanner}>
          <MaterialCommunityIcons
            name="wifi-off"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={styles.offlineBannerText}>
            {`Mostrando datos guardados${lastFetchedLabel}`}
          </Text>
        </View>
      )}

      {/* Span selector pills */}
      <View style={styles.spanRow}>
        {(['today', 'week', 'month'] as TodaySpan[]).map((s) => {
          const label = s === 'today' ? 'Hoy' : s === 'week' ? 'Esta semana' : 'Este mes'
          const active = span === s
          return (
            <Pressable
              key={s}
              style={[styles.spanPill, active && styles.spanPillActive]}
              onPress={() => fetchTodayVisits(s)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
            >
              <Text style={[styles.spanPillText, active && styles.spanPillTextActive]}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Next appointment card — stories 6.5 + 6.6 */}
      <View style={styles.section}>{renderNextCard()}</View>

      {/* Visit list */}
      <View style={styles.section}>
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          {visits.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {visits.length} {visits.length === 1 ? 'visita' : 'visitas'}
              </Text>
            </View>
          )}
        </View>

        {/* Visit rows or empty state */}
        {visits.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.visitList}>
            {visits.map((visit) => renderVisitRow(visit))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // ── Layout ────────────────────────────────────────────────────────────────
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing[8],
  },

  // ── Header ────────────────────────────────────────────────────────────────
  headerGear: {
    marginRight: spacing[4],
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular as '400',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },

  // ── Span selector ─────────────────────────────────────────────────────────
  spanRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    gap: spacing[2],
  },
  spanPill: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  spanPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  spanPillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },
  spanPillTextActive: {
    color: colors.textOnPrimary,
  },

  // ── Offline banner — story 6.7 ────────────────────────────────────────────
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.statusCanceledLight,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  offlineBannerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  countBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
    color: colors.primary,
  },

  // ── Next appointment card — stories 6.5 + 6.6 ────────────────────────────
  nextCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    ...shadows.subtle,
    borderLeftWidth: 4,
  },
  nextCardLoading: {
    borderLeftWidth: 0,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextCardUpcoming: {
    borderLeftColor: colors.primary,
    backgroundColor: colors.surface,
  },
  nextCardOverdue: {
    borderLeftColor: colors.warning,
    backgroundColor: colors.warningLight,
  },
  nextCardDone: {
    borderLeftColor: colors.success,
    backgroundColor: colors.successLight,
    alignItems: 'flex-start',
  },
  nextCardPressed: {
    opacity: 0.85,
  },
  nextCardLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing[1],
  },
  nextCardClientName: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold as '700',
    color: colors.textPrimary,
    marginBottom: spacing[1],
  },
  nextCardTime: {
    fontSize: fontSize.base,
  },
  nextCardDoneEmoji: {
    fontSize: fontSize['2xl'],
    marginBottom: spacing[1],
  },
  nextCardDoneTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as '600',
    marginBottom: spacing[1],
  },
  nextCardDoneSubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },

  // ── Visit list — story 6.4 ────────────────────────────────────────────────
  visitList: {
    gap: spacing[2],
  },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    ...shadows.subtle,
    gap: spacing[3],
  },
  visitRowPressed: {
    backgroundColor: colors.background,
  },
  visitRowTime: {
    width: 52,
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  visitTimeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold as '700',
  },
  visitRowContent: {
    flex: 1,
    justifyContent: 'center',
  },
  visitClientName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  visitSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular as '400',
    color: colors.textSecondary,
    marginTop: spacing[1],
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    gap: spacing[3],
  },
  emptyEmoji: {
    fontSize: fontSize['3xl'],
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyButton: {
    minHeight: 48,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  emptyButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textOnPrimary,
  },
})
