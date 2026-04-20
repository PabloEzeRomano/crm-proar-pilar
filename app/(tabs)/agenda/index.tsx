/**
 * app/(tabs)/agenda/index.tsx — Today Dashboard
 *
 * Stories 6.4, 6.5, 6.6, 6.7 — EP-006
 * EP-019: Added rn-tourguide chapter "agenda" (3 steps)
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

import TourStep from '@/components/tour/TourStep';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { StatsModal } from '@/components/today/StatsCard';
import { VisitRow } from '@/components/visits/VisitRow';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  shadows,
  spacing,
} from '@/constants/theme';
import { useToday } from '@/hooks/useToday';
import dayjs from '@/lib/dayjs';
import { useAuthStore } from '@/stores/authStore';
import { TodaySpan, useTodayStore } from '@/stores/todayStore';
import { VisitWithClient } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a minute count into a human-readable string.
 * Uses the absolute value, e.g. -25 → "25 minutos", 90 → "1 h 30 min".
 */
function formatMinutes(mins: number): string {
  const abs = Math.abs(mins);
  if (abs < 60) return `${abs} minuto${abs !== 1 ? 's' : ''}`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

// ---------------------------------------------------------------------------
// Inner screen component (needs to be inside TourGuideProvider)
// ---------------------------------------------------------------------------

function TodayScreenContent() {
  const router = useRouter();
  const navigation = useNavigation();
  const [sortLoading, setSortLoading] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const profile = useAuthStore((state) => state.profile);
  const isAdminOrRoot = profile?.role === 'admin' || profile?.role === 'root';

  const {
    visits,
    span,
    nextVisit,
    isNextOverdue,
    loading,
    isStale,
    lastFetched,
    fetchTodayVisits,
  } = useToday(isAdminOrRoot);

  console.log(
    'TodayScreenContent',
    visits.map((v) => v.owner)
  );

  const sortedByDistance = useTodayStore((s) => s.sortedByDistance);
  const sortByDistance = useTodayStore((s) => s.sortByDistance);
  const resetDistanceSort = useTodayStore((s) => s.resetDistanceSort);

  const handleToggleSort = async () => {
    if (sortedByDistance) {
      resetDistanceSort();
      return;
    }

    setSortLoading(true);
    try {
      await sortByDistance();
    } catch (error) {
      Alert.alert('Error', 'No se pudieron obtener coordenadas de ubicación');
    } finally {
      setSortLoading(false);
    }
  };

  // ── Auto-refresh while screen is focused ────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      fetchTodayVisits(span);
      const interval = setInterval(() => fetchTodayVisits(span), 60_000);
      return () => clearInterval(interval);
    }, [span])
  );

  // ── Header: gear icon + date subtitle ───────────────────────────────────
  const headerSubtitle = useMemo(() => {
    if (span === 'today') return dayjs().format('dddd D [de] MMMM');
    if (span === 'week') {
      const start = dayjs().startOf('week');
      const end = dayjs().endOf('week');
      return `${start.format('D')} – ${end.format('D [de] MMMM')}`;
    }
    return dayjs().format('MMMM YYYY');
  }, [span]);

  const sectionTitle =
    span === 'today'
      ? 'Agenda de hoy'
      : span === 'week'
        ? 'Esta semana'
        : 'Este mes';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setStatsVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.headerIconBtn}
            accessibilityLabel="Estadísticas"
          >
            <MaterialCommunityIcons
              name="chart-bar"
              size={22}
              color={colors.primary}
            />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/settings')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.headerIconBtn}
            accessibilityLabel="Configuración"
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color={colors.primary}
            />
          </Pressable>
        </View>
      ),
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {span === 'today'
              ? 'Agenda'
              : span === 'week'
                ? 'Esta semana'
                : 'Este mes'}
          </Text>
          <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
        </View>
      ),
    });
  }, [navigation, router, span, headerSubtitle]);

  // ── Next visit card state ────────────────────────────────────────────────
  const cardState: 'loading' | 'done' | 'overdue' | 'upcoming' =
    loading && visits.length === 0
      ? 'loading'
      : nextVisit === null
        ? 'done'
        : isNextOverdue
          ? 'overdue'
          : 'upcoming';

  // Compute fresh display minutes from scheduled_at on every render
  // (so the countdown stays accurate within the 60s refresh cycle)
  const liveMinutesUntilNext = useMemo<number | null>(() => {
    if (!nextVisit) return null;
    return dayjs(nextVisit.scheduled_at).diff(dayjs(), 'minute');
  }, [nextVisit]);
  // Note: this is intentionally recalculated on each render, not only when
  // nextVisit changes. The dependency on nextVisit is still correct —
  // a new render triggered by the 60s interval will recompute the value.

  // ── Derived strings for next-visit card ─────────────────────────────────
  const nextVisitTimeLabel = useMemo<string>(() => {
    if (!nextVisit) return '';
    return dayjs(nextVisit.scheduled_at).format('HH:mm');
  }, [nextVisit]);

  const nextVisitCountdownLabel = useMemo<string>(() => {
    if (liveMinutesUntilNext === null) return '';
    if (liveMinutesUntilNext >= 0) {
      return `en ${formatMinutes(liveMinutesUntilNext)}`;
    }
    return `Atrasado por ${formatMinutes(liveMinutesUntilNext)}`;
  }, [liveMinutesUntilNext]);

  // ── Offline banner last-fetched label ───────────────────────────────────
  const lastFetchedLabel = useMemo<string>(() => {
    if (!lastFetched) return '';
    return ` · ${dayjs(lastFetched).format('HH:mm')}`;
  }, [lastFetched]);

  // ── Helpers ─────────────────────────────────────────────────────────────

  function handleVisitPress(visit: VisitWithClient) {
    router.push(`/(tabs)/agenda/visits/${visit.id}`);
  }

  function handleNextCardPress() {
    if (nextVisit) {
      router.push(`/(tabs)/agenda/visits/${nextVisit.id}`);
    }
  }

  function handleNewVisitPress() {
    router.push('/visits/form');
  }

  // ── Render: Next visit card ──────────────────────────────────────────────

  function renderNextCard() {
    if (cardState === 'loading') {
      return (
        <View style={[styles.nextCard, styles.nextCardLoading]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (cardState === 'done') {
      return (
        <View style={[styles.nextCard, styles.nextCardDone]}>
          <MaterialCommunityIcons
            name="check-circle"
            size={32}
            color={colors.success}
            style={styles.nextCardDoneIcon}
          />
          <Text style={[styles.nextCardDoneTitle, { color: colors.success }]}>
            Todo listo por hoy
          </Text>
          <Text style={styles.nextCardDoneSubtitle}>
            No quedan visitas pendientes
          </Text>
        </View>
      );
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
          <View style={styles.nextCardLabelRow}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={14}
              color={colors.warning}
            />
            <Text style={[styles.nextCardLabel, { color: colors.warning }]}>
              ATRASADO
            </Text>
          </View>
          <Text style={styles.nextCardClientName} numberOfLines={1}>
            {nextVisit?.client.name}
          </Text>
          <Text style={[styles.nextCardTime, { color: colors.warning }]}>
            {nextVisitCountdownLabel}
          </Text>
        </Pressable>
      );
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
        <View style={styles.nextCardLabelRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={14}
            color={colors.primary}
          />
          <Text style={[styles.nextCardLabel, { color: colors.primary }]}>
            SIGUIENTE
          </Text>
        </View>
        <Text style={styles.nextCardClientName} numberOfLines={1}>
          {nextVisit?.client.name}
        </Text>
        <Text style={[styles.nextCardTime, { color: colors.textSecondary }]}>
          {nextVisitTimeLabel} · {nextVisitCountdownLabel}
        </Text>
      </Pressable>
    );
  }

  // ── Render: Visit row ────────────────────────────────────────────────────

  function renderVisitRow(visit: VisitWithClient) {
    return (
      <VisitRow
        key={visit.id}
        visit={visit}
        onPress={() => handleVisitPress(visit)}
        showOwner={isAdminOrRoot && !!visit.owner}
      />
    );
  }

  // ── Render: Empty state ──────────────────────────────────────────────────

  function renderEmptyState() {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="calendar-blank"
          size={40}
          color={colors.textDisabled}
        />
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
    );
  }

  // ── Root render ──────────────────────────────────────────────────────────

  return (
    <>
      <StatsModal
        visible={statsVisible}
        onClose={() => setStatsVisible(false)}
      />
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

        {/* ── Tour step 1: Span selector pills ── */}
        <TourStep
          order={1}
          text="Filtrá tu agenda por Hoy, Esta semana o Este mes. El contador de abajo se actualiza en tiempo real."
          borderRadius={borderRadius.full}
          routePath="/(tabs)/agenda"
        >
          <View style={styles.spanRow}>
            {(['today', 'week', 'month'] as TodaySpan[]).map((s) => {
              const label =
                s === 'today'
                  ? 'Hoy'
                  : s === 'week'
                    ? 'Esta semana'
                    : 'Este mes';
              const active = span === s;
              return (
                <Pressable
                  key={s}
                  style={[styles.spanPill, active && styles.spanPillActive]}
                  onPress={() => fetchTodayVisits(s)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={label}
                >
                  <Text
                    style={[
                      styles.spanPillText,
                      active && styles.spanPillTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </TourStep>

        {/* ── Tour step 2: Next appointment card ── */}
        <TourStep
          order={2}
          text="Tu próxima visita pendiente aparece acá. Muestra el cliente, la hora y el tiempo restante. Tocá para ver los detalles y agregar notas."
          borderRadius={borderRadius.lg}
          routePath="/(tabs)/agenda"
        >
          <View style={styles.section}>{renderNextCard()}</View>
        </TourStep>

        {/* Visit list */}
        <View style={styles.section}>
          {/* ── Tour step 3: Visit list section header ── */}
          <TourStep
            order={3}
            text="Acá está tu agenda completa. Tocá cualquier visita para ver los detalles, cambiar el estado o escribir la minuta de la reunión."
            borderRadius={borderRadius.md}
            routePath="/(tabs)/agenda"
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{sectionTitle}</Text>
              {visits.length > 0 && (
                <>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {visits.length}{' '}
                      {visits.length === 1 ? 'visita' : 'visitas'}
                    </Text>
                  </View>
                  {/* Sort toggle button — only on native platforms (expo-location not available on web) */}
                  {Platform.OS !== 'web' && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.sortButton,
                        pressed && styles.sortButtonPressed,
                      ]}
                      onPress={handleToggleSort}
                      disabled={sortLoading}
                      accessibilityRole="button"
                      accessibilityLabel={
                        sortedByDistance
                          ? 'Ordenar por hora'
                          : 'Ordenar por distancia'
                      }
                    >
                      {sortLoading ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.textSecondary}
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name={
                            sortedByDistance
                              ? 'clock-outline'
                              : 'map-marker-distance'
                          }
                          size={20}
                          color={colors.textSecondary}
                        />
                      )}
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </TourStep>

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
    </>
  );
}

export default TodayScreenContent;

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing[2],
    gap: spacing[1],
  },
  headerIconBtn: {
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
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  spanPill: {
    flex: 1,
    height: 48,
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
  sortButton: {
    marginLeft: 'auto',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortButtonPressed: {
    opacity: 0.7,
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
  nextCardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[1],
  },
  nextCardLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
  nextCardDoneIcon: {
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

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    gap: spacing[3],
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
});
