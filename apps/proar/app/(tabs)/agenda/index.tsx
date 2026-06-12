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
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { StatsModal } from '@/components/today/StatsCard';
import { StatusTypeBadge } from '@/components/ui/StatusTypeBadge';
import { VisitRow } from '@/components/visits/VisitRow';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  shadows,
  spacing,
  visitTypeColors,
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
// Client group card — multiple visits for same client
// ---------------------------------------------------------------------------

function GroupVisitRow({
  visit,
  clientName,
  onPress,
  showOwner,
}: {
  visit: VisitWithClient;
  clientName: string;
  onPress: () => void;
  showOwner: boolean;
}) {
  const scheduledDayjs = dayjs(visit.scheduled_at);
  const isCompleted = visit.status === 'completed';
  const isCanceled = visit.status === 'canceled';
  const isPendingOverdue =
    visit.status === 'pending' && scheduledDayjs.isBefore(dayjs());
  const rowOpacity = isCompleted ? 0.5 : isCanceled ? 0.4 : 1;
  const timeColor = isPendingOverdue ? colors.warning : colors.textPrimary;

  return (
    <Pressable
      style={({ pressed }) => [
        groupStyles.row,
        pressed && groupStyles.rowPressed,
        { opacity: rowOpacity, borderLeftColor: visitTypeColors[visit.type] },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver gestión de ${clientName}`}
    >
      <View style={groupStyles.timeCol}>
        <Text style={groupStyles.dateText}>
          {scheduledDayjs.format('DD/MM')}
        </Text>
        <Text style={[groupStyles.timeText, { color: timeColor }]}>
          {scheduledDayjs.format('HH:mm')}
        </Text>
      </View>
      <View style={groupStyles.infoCol}>
        {visit.title ? (
          <Text style={groupStyles.titleText} numberOfLines={1}>
            {visit.title}
          </Text>
        ) : null}
        {visit.contact_snapshot?.name ? (
          <Text style={groupStyles.contactText} numberOfLines={1}>
            👤 {visit.contact_snapshot.name}
          </Text>
        ) : null}
        {showOwner && visit.owner?.full_name ? (
          <Text style={groupStyles.ownerText} numberOfLines={1}>
            {visit.owner.full_name}
          </Text>
        ) : null}
      </View>
      <View style={groupStyles.badgeCol}>
        <StatusTypeBadge type={visit.type} />
        <StatusTypeBadge status={visit.status} type={visit.type} />
      </View>
    </Pressable>
  );
}

function ClientGroupCard({
  visits,
  onVisitPress,
  showOwner,
}: {
  visits: VisitWithClient[];
  onVisitPress: (v: VisitWithClient) => void;
  showOwner: boolean;
}) {
  const client = visits[0].client;
  const pending = visits.filter((v) => v.status === 'pending');
  const completed = visits.filter((v) => v.status !== 'pending');
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={groupStyles.card}>
      <View style={groupStyles.header}>
        <MaterialCommunityIcons
          name="domain"
          size={16}
          color={colors.textSecondary}
        />
        <Text style={groupStyles.clientName} numberOfLines={1}>
          {client.name}
        </Text>
        <View style={groupStyles.countPill}>
          <Text style={groupStyles.countPillText}>
            {visits.length} gest.
            {pending.length > 0 && ` · ${pending.length} pend.`}
          </Text>
        </View>
      </View>

      {pending.map((visit) => (
        <GroupVisitRow
          key={visit.id}
          visit={visit}
          clientName={client.name}
          onPress={() => onVisitPress(visit)}
          showOwner={showOwner}
        />
      ))}

      {completed.length > 0 && (
        <>
          <Pressable
            style={groupStyles.accordion}
            onPress={() => setExpanded((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? 'Ocultar completadas' : 'Ver completadas'
            }
          >
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
            <Text style={groupStyles.accordionText}>
              {completed.length} completada{completed.length !== 1 ? 's' : ''}
            </Text>
          </Pressable>

          {expanded &&
            completed.map((visit) => (
              <GroupVisitRow
                key={visit.id}
                visit={visit}
                clientName={client.name}
                onPress={() => onVisitPress(visit)}
                showOwner={showOwner}
              />
            ))}
        </>
      )}
    </View>
  );
}

const groupStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    overflow: 'hidden',
    ...shadows.subtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  clientName: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  countPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 3,
  },
  rowPressed: {
    backgroundColor: colors.border,
  },
  timeCol: {
    width: 44,
    flexShrink: 0,
    gap: 2,
  },
  dateText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  timeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  titleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  contactText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  ownerText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  badgeCol: {
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: spacing[1],
  },
  accordion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  accordionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
});

// ---------------------------------------------------------------------------
// Inner screen component (needs to be inside TourGuideProvider)
// ---------------------------------------------------------------------------

function TodayScreenContent() {
  const router = useRouter();
  const navigation = useNavigation();
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

  const PROGRESS_KEY = 'agenda-progress-visible';
  const [progressVisible, setProgressVisible] = useState(true);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(PROGRESS_KEY).then((val) => {
        setProgressVisible(val !== 'false');
      });
    }, [])
  );

  function handleDismissProgress() {
    setProgressVisible(false);
    AsyncStorage.setItem(PROGRESS_KEY, 'false');
  }

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
  }, [navigation, router]);

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

  // ── Progress card ────────────────────────────────────────────────────────
  const completedCount = useMemo(
    () => visits.filter((v) => v.status === 'completed').length,
    [visits]
  );
  const totalCount = visits.length;
  const progressPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // ── Group visits by client ────────────────────────────────────────────
  const groupedVisits = useMemo(() => {
    const groups = new Map<string, VisitWithClient[]>();
    for (const visit of visits) {
      const key = visit.client_id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(visit);
    }
    return Array.from(groups.values()).sort((a, b) => {
      const aFirst = a[0];
      const bFirst = b[0];
      const aCompleted = aFirst.status === 'completed' || aFirst.status === 'canceled';
      const bCompleted = bFirst.status === 'completed' || bFirst.status === 'canceled';
      if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
      return dayjs(aFirst.scheduled_at).diff(dayjs(bFirst.scheduled_at));
    });
  }, [visits]);

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
    router.push('/(tabs)/agenda/visits/form');
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
            No quedan gestiones pendientes
          </Text>
        </View>
      );
    }

    if (cardState === 'overdue') {
      return (
        <Pressable
          style={({ pressed }) => [styles.nextCardHero, pressed && styles.nextCardPressed]}
          onPress={handleNextCardPress}
          accessibilityRole="button"
          accessibilityLabel={`Gestión atrasada: ${nextVisit?.client.name}`}
        >
          <LinearGradient
            colors={['#D97706', '#B45309']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nextCardGradient}
          >
            {/* Background glyph */}
            <MaterialCommunityIcons
              name="map-marker"
              size={100}
              color="rgba(255,255,255,0.08)"
              style={styles.nextCardBgGlyph}
            />
            {/* Label pill */}
            <View style={styles.nextCardPill}>
              <MaterialCommunityIcons name="alert-circle" size={13} color="rgba(255,220,80,0.95)" />
              <Text style={[styles.nextCardPillText, { color: 'rgba(255,220,80,0.95)' }]}>
                ATRASADO · {nextVisitCountdownLabel}
              </Text>
            </View>
            {/* Client name */}
            <Text style={styles.nextCardHeroName} numberOfLines={1}>
              {nextVisit?.client.name}
            </Text>
            {/* Address + scheduled time */}
            <View style={styles.nextCardAddressRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.nextCardAddressText} numberOfLines={1}>
                {nextVisit?.client.address
                  ? `${nextVisit.client.address}${nextVisit.client.city ? ', ' + nextVisit.client.city : ''}`
                  : nextVisit?.client.city ?? ''}
                {' · debía ser '}{nextVisitTimeLabel}
              </Text>
            </View>
            {/* Navegar action */}
            <View style={styles.nextCardNavRow}>
              <MaterialCommunityIcons name="navigation" size={12} color="#fff" />
              <Text style={styles.nextCardNavText}>Navegar</Text>
            </View>
          </LinearGradient>
        </Pressable>
      );
    }

    // cardState === 'upcoming'
    return (
      <Pressable
        style={({ pressed }) => [styles.nextCardHero, pressed && styles.nextCardPressed]}
        onPress={handleNextCardPress}
        accessibilityRole="button"
        accessibilityLabel={`Siguiente gestión: ${nextVisit?.client.name}`}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.nextCardGradient}
        >
          <MaterialCommunityIcons
            name="map-marker"
            size={100}
            color="rgba(255,255,255,0.08)"
            style={styles.nextCardBgGlyph}
          />
          <View style={styles.nextCardPill}>
            <MaterialCommunityIcons name="clock-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={[styles.nextCardPillText, { color: 'rgba(255,255,255,0.85)' }]}>
              SIGUIENTE · {nextVisitCountdownLabel}
            </Text>
          </View>
          <Text style={styles.nextCardHeroName} numberOfLines={1}>
            {nextVisit?.client.name}
          </Text>
          <View style={styles.nextCardAddressRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.nextCardAddressText} numberOfLines={1}>
              {nextVisit?.client.address
                ? `${nextVisit.client.address}${nextVisit.client.city ? ', ' + nextVisit.client.city : ''}`
                : nextVisit?.client.city ?? ''}
              {' · '}{nextVisitTimeLabel}
            </Text>
          </View>
          {/* <View style={styles.nextCardNavRow}>
            <MaterialCommunityIcons name="navigation" size={12} color="#fff" />
            <Text style={styles.nextCardNavText}>Navegar</Text>
          </View> */}
        </LinearGradient>
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
            ? 'No hay gestiones programadas para hoy'
            : span === 'week'
              ? 'No hay gestiones esta semana'
              : 'No hay gestiones este mes'}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.emptyButton,
            pressed && styles.emptyButtonPressed,
          ]}
          onPress={handleNewVisitPress}
          accessibilityRole="button"
          accessibilityLabel="Nueva gestión"
        >
          <Text style={styles.emptyButtonText}>Nueva gestión</Text>
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
        {/* ── Page header: title + date + span pills ── */}
        <View style={styles.pageHeader}>
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
        </View>

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

        {/* ── Daily progress card ── */}
        {totalCount > 0 && progressVisible && (
          <View style={styles.progressCardWrapper}>
            <View style={styles.progressCard}>
              <View style={styles.progressCardLeft}>
                <Text style={styles.progressCardTitle}>Progreso del día</Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressPct}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressCardLabel}>
                  {completedCount} de {totalCount} gestiones completadas
                </Text>
              </View>
              <Text style={styles.progressPct}>{progressPct}%</Text>
              <Pressable
                onPress={handleDismissProgress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.progressDismiss}
                accessibilityRole="button"
                accessibilityLabel="Ocultar progreso"
              >
                <MaterialCommunityIcons
                  name="close"
                  size={16}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Tour step 2: Next appointment card ── */}
        <TourStep
          order={2}
          text="Tu próxima gestión pendiente aparece acá. Muestra el cliente, la hora y el tiempo restante. Tocá para ver los detalles y agregar notas."
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
            text="Acá está tu agenda completa. Tocá cualquier gestión para ver los detalles, cambiar el estado o escribir la minuta."
            borderRadius={borderRadius.md}
            routePath="/(tabs)/agenda"
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{sectionTitle}</Text>
              {visits.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {visits.length}{' '}
                    {visits.length === 1 ? 'gestión' : 'gestiones'}
                  </Text>
                </View>
              )}
            </View>
          </TourStep>

          {/* Visit rows or empty state */}
          {visits.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.visitList}>
              {groupedVisits.map((group) =>
                group.length === 1 ? (
                  renderVisitRow(group[0])
                ) : (
                  <ClientGroupCard
                    key={group[0].client_id}
                    visits={group}
                    onVisitPress={handleVisitPress}
                    showOwner={isAdminOrRoot}
                  />
                )
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Nueva gestión FAB ── */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={handleNewVisitPress}
        accessibilityRole="button"
        accessibilityLabel="Nueva gestión"
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </Pressable>
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

  // ── Header icons (nav bar right side) ────────────────────────────────────
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
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },

  // ── Page header (inline title + date + span pills) ─────────────────────
  pageHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pageTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    marginBottom: spacing[1],
  },

  // ── Span selector ─────────────────────────────────────────────────────────
  spanRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  spanPill: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  spanPillActive: {
    backgroundColor: colors.primary,
  },
  spanPillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
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
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  countBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  countBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  // ── Daily progress card ───────────────────────────────────────────────────
  progressCardWrapper: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    ...shadows.subtle,
  },
  progressCardLeft: {
    flex: 1,
    gap: spacing[2],
  },
  progressCardTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  progressCardLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressPct: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    minWidth: 52,
    textAlign: 'right',
  },
  progressDismiss: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  nextCardClientName: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
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
    fontWeight: fontWeight.semibold,
    marginBottom: spacing[1],
  },
  nextCardDoneSubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  nextCardHero: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  nextCardGradient: {
    padding: spacing[4],
    // minHeight: 140,
    position: 'relative',
    overflow: 'hidden',
  },
  nextCardBgGlyph: {
    position: 'absolute',
    right: -12,
    top: -12,
  },
  nextCardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  nextCardPillText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  nextCardHeroName: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: spacing[1],
  },
  nextCardAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[3],
  },
  nextCardAddressText: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    flex: 1,
  },
  nextCardNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  nextCardNavText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },

  // ── Visit list — story 6.4 ────────────────────────────────────────────────
  visitList: {
    marginHorizontal: -spacing[4],
  },

  // ── Nueva gestión FAB ────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: spacing[6],
    right: spacing[4],
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.subtle,
    shadowColor: colors.primary,
  },
  fabPressed: {
    opacity: 0.85,
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
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});
