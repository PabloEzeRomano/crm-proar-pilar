/**
 * StatsModal — EP-018 (story 18.3) + EP-039
 *
 * Bottom-sheet-style modal with visit statistics.
 * Triggered by the chart icon in the Today screen header.
 *
 * Shows:
 *   - Week and month visit counts + completion rates (18.1)
 *   - Top clients by visit frequency (18.2)
 *   - EP-039: "Completed only" toggle + date range filter
 */

import React, { useEffect, useState } from 'react'
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { borderRadius, colors, fontSize, fontWeight, shadows, spacing } from '@/constants/theme'
import { useVisitStats } from '@/hooks/useVisitStats'
import AppDatePicker from '@/components/ui/AppDatePicker'
import dayjs from '@/lib/dayjs'
import { useAuthStore } from '@/stores/authStore'
import { useVisitsStore } from '@/stores/visitsStore'
import { useUsersStore } from '@/stores/usersStore'

interface StatsModalProps {
  visible: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ rate }: { rate: number }) {
  const fillColor = rate >= 75 ? colors.success : rate >= 50 ? colors.warning : colors.error
  return (
    <View style={pbStyles.track}>
      <View style={[pbStyles.fill, { width: `${rate}%` as `${number}%`, backgroundColor: fillColor }]} />
    </View>
  )
}

const pbStyles = StyleSheet.create({
  track: {
    height: 6,
    flex: 1,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
})

// ---------------------------------------------------------------------------
// Period card (week / month)
// ---------------------------------------------------------------------------

interface PeriodCardProps {
  label: string
  total: number
  totalAll: number
  completed: number
  pending: number
  completionRate: number
  completedOnly: boolean
}

function PeriodCard({ label, total, totalAll, completed, pending, completionRate, completedOnly }: PeriodCardProps) {
  // When completedOnly is active, show real completion rate against unfiltered total
  const displayRate = completedOnly && totalAll > 0 ? Math.round((total / totalAll) * 100) : completionRate
  const rateColor = displayRate >= 75 ? colors.success : displayRate >= 50 ? colors.warning : colors.error
  const showAsFraction = completedOnly && totalAll > total

  return (
    <View style={pcStyles.card}>
      <Text style={pcStyles.label}>{label}</Text>
      <Text style={pcStyles.total}>
        {showAsFraction ? `${total} de ${totalAll}` : total}
        <Text style={pcStyles.unit}> {totalAll === 1 ? 'visita' : 'visitas'}</Text>
      </Text>

      <View style={pcStyles.row}>
        <MaterialCommunityIcons name="check-circle-outline" size={14} color={colors.success} />
        <Text style={pcStyles.stat}>{completed} completadas</Text>
      </View>
      <View style={pcStyles.row}>
        <MaterialCommunityIcons name="clock-outline" size={14} color={colors.warning} />
        <Text style={pcStyles.stat}>{pending} pendientes</Text>
      </View>

      <View style={pcStyles.rateRow}>
        <ProgressBar rate={displayRate} />
        <Text style={[pcStyles.rateText, { color: rateColor }]}>{displayRate}%</Text>
      </View>
    </View>
  )
}

const pcStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[1],
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[1],
  },
  total: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold as '700',
    color: colors.textPrimary,
    marginBottom: spacing[1],
  },
  unit: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular as '400',
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  stat: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  rateText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as '700',
    minWidth: 32,
    textAlign: 'right',
  },
})

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

export function StatsModal({ visible, onClose }: StatsModalProps) {
  // Default range: first day of current month → today
  const [completedOnly, setCompletedOnly] = useState(true)
  const [dateFrom, setDateFrom] = useState<Date | null>(() => dayjs().startOf('month').toDate())
  const [dateTo, setDateTo] = useState<Date | null>(() => dayjs().toDate())
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showToPicker, setShowToPicker] = useState(false)
  // null = all users (admin default); string = specific user; undefined = own data (regular user)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const profile = useAuthStore((s) => s.profile)
  const { allVisits, fetchAllVisitsForAdmin } = useVisitsStore()
  const { users, fetchUsers } = useUsersStore()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'root'

  // Fetch all-users data when admin opens the modal
  useEffect(() => {
    if (!visible || !isAdmin) return
    if (allVisits.length === 0) fetchAllVisitsForAdmin()
    if (users.length === 0) fetchUsers()
  }, [visible])

  const datesActive = !!(dateFrom && dateTo)
  const clearDates = () => { setDateFrom(null); setDateTo(null) }
  const resetDates = () => { setDateFrom(dayjs().startOf('month').toDate()); setDateTo(dayjs().toDate()) }

  // For admin: pass selectedUserId (null = all, string = specific user)
  // For regular user: pass undefined (uses own visits store)
  const statsUserId = isAdmin ? selectedUserId : undefined
  const stats = useVisitStats({ completedOnly, dateFrom, dateTo, userId: statsUserId })
  const { hasDateFilter } = stats
  const rangeDateLabel = datesActive
    ? `${dayjs(dateFrom).format('DD/MM')} – ${dayjs(dateTo).format('DD/MM')}`
    : ''
  const hasData =
    (hasDateFilter ? stats.range.totalAll > 0 : stats.week.total > 0 || stats.month.total > 0) ||
    stats.topClients.length > 0

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sheet */}
      <View style={styles.sheet}>
        {/* Handle bar */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <MaterialCommunityIcons name="chart-bar" size={20} color={colors.primary} />
          <Text style={styles.sheetTitle}>Estadísticas</Text>
          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar estadísticas"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Filters ─────────────────────────────────────────────── */}
          <View style={styles.filtersSection}>
            {/* Admin user selector — visible only for admin/root */}
            {isAdmin && (
              <View style={styles.userSelectorSection}>
                <Text style={styles.userSelectorLabel}>Usuario</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.userPillsRow}
                >
                  {/* "Todos" pill */}
                  <Pressable
                    style={[
                      styles.userPill,
                      selectedUserId === null && styles.userPillSelected,
                    ]}
                    onPress={() => setSelectedUserId(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Ver todos los usuarios"
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <Text style={[
                      styles.userPillText,
                      selectedUserId === null && styles.userPillTextSelected,
                    ]}>
                      Todos
                    </Text>
                  </Pressable>

                  {/* One pill per active user */}
                  {users.filter((u) => u.status === 'active').map((u) => (
                    <Pressable
                      key={u.id}
                      style={[
                        styles.userPill,
                        selectedUserId === u.id && styles.userPillSelected,
                      ]}
                      onPress={() => setSelectedUserId(u.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver estadísticas de ${u.full_name ?? u.email}`}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Text
                        style={[
                          styles.userPillText,
                          selectedUserId === u.id && styles.userPillTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {u.full_name ?? u.email}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Completed only toggle */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Solo completadas</Text>
              <Switch
                value={completedOnly}
                onValueChange={setCompletedOnly}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={completedOnly ? colors.primary : colors.textDisabled}
              />
            </View>

            {/* Date range header */}
            <View style={styles.dateRangeHeader}>
              <Text style={styles.datePickerLabel}>Rango de fechas</Text>
              {datesActive ? (
                <Pressable
                  onPress={clearDates}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Quitar filtro de fechas"
                >
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={resetDates}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Agregar filtro de fechas"
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                </Pressable>
              )}
            </View>

            {/* Date range pickers — only when active */}
            {datesActive && (
              <>
                <View style={styles.dateRangeRow}>
                  <View style={styles.datePickerGroup}>
                    <Text style={styles.datePickerLabel}>Desde</Text>
                    {Platform.OS === 'android' ? (
                      <Pressable
                        style={({ pressed }) => [styles.dateDisplayButton, pressed && styles.dateDisplayButtonPressed]}
                        onPress={() => setShowFromPicker(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Seleccionar fecha desde"
                      >
                        <Text style={styles.dateDisplayText}>{dayjs(dateFrom).format('DD/MM/YYYY')}</Text>
                        <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
                      </Pressable>
                    ) : (
                      <AppDatePicker
                        value={dateFrom!}
                        mode="date"
                        display="inline"
                        onChange={setDateFrom}
                        accentColor={colors.primary}
                        locale="es"
                      />
                    )}
                  </View>
                  <View style={styles.datePickerGroup}>
                    <Text style={styles.datePickerLabel}>Hasta</Text>
                    {Platform.OS === 'android' ? (
                      <Pressable
                        style={({ pressed }) => [styles.dateDisplayButton, pressed && styles.dateDisplayButtonPressed]}
                        onPress={() => setShowToPicker(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Seleccionar fecha hasta"
                      >
                        <Text style={styles.dateDisplayText}>{dayjs(dateTo).format('DD/MM/YYYY')}</Text>
                        <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
                      </Pressable>
                    ) : (
                      <AppDatePicker
                        value={dateTo!}
                        mode="date"
                        display="inline"
                        onChange={setDateTo}
                        accentColor={colors.primary}
                        locale="es"
                      />
                    )}
                  </View>
                </View>

                {/* Android date pickers — rendered as modal dialogs, one at a time */}
                {Platform.OS === 'android' && showFromPicker && (
                  <AppDatePicker
                    value={dateFrom!}
                    mode="date"
                    display="calendar"
                    onChange={(date) => { setDateFrom(date); setShowFromPicker(false); setShowToPicker(true) }}
                    isAndroidModal
                    onDismiss={() => setShowFromPicker(false)}
                    accentColor={colors.primary}
                    locale="es"
                  />
                )}
                {Platform.OS === 'android' && showToPicker && (
                  <AppDatePicker
                    value={dateTo!}
                    mode="date"
                    display="calendar"
                    onChange={(date) => { setDateTo(date); setShowToPicker(false) }}
                    isAndroidModal
                    onDismiss={() => setShowToPicker(false)}
                    accentColor={colors.primary}
                    locale="es"
                  />
                )}
              </>
            )}
          </View>

          {hasData ? (
            <>
              {/* Period cards */}
              {hasDateFilter ? (
                <View style={styles.periodsRow}>
                  <PeriodCard
                    label={rangeDateLabel}
                    total={stats.range.total}
                    totalAll={stats.range.totalAll}
                    completed={stats.range.completed}
                    pending={stats.range.pending}
                    completionRate={stats.range.completionRate}
                    completedOnly={completedOnly}
                  />
                </View>
              ) : (
                <View style={styles.periodsRow}>
                  <PeriodCard
                    label="Esta semana"
                    total={stats.week.total}
                    totalAll={stats.week.totalAll}
                    completed={stats.week.completed}
                    pending={stats.week.pending}
                    completionRate={stats.week.completionRate}
                    completedOnly={completedOnly}
                  />
                  <PeriodCard
                    label="Este mes"
                    total={stats.month.total}
                    totalAll={stats.month.totalAll}
                    completed={stats.month.completed}
                    pending={stats.month.pending}
                    completionRate={stats.month.completionRate}
                    completedOnly={completedOnly}
                  />
                </View>
              )}

              {/* Top clients */}
              {stats.topClients.length > 0 && (
                <View style={styles.topSection}>
                  <Text style={styles.topSectionTitle}>Top clientes</Text>
                  {stats.topClients.map((client, index) => (
                    <View key={client.clientId} style={styles.topRow}>
                      <Text style={styles.topRank}>{index + 1}</Text>
                      <Text style={styles.topName} numberOfLines={1}>
                        {client.clientName}
                      </Text>
                      <View style={styles.topBadge}>
                        <Text style={styles.topBadgeText}>{client.visitCount}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyText}>
                No hay datos para el período seleccionado.{'\n'}Ajustá los filtros o el rango de fechas.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing[8],
    maxHeight: '85%',
    ...shadows.subtle,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.full,
  },
  closeBtnPressed: {
    backgroundColor: colors.background,
  },
  scrollView: {
    flexGrow: 0,
  },
  content: {
    padding: spacing[4],
    gap: spacing[5],
  },

  // Filters section
  filtersSection: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium as '500',
    color: colors.textPrimary,
  },
  dateRangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateRangeRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  datePickerGroup: {
    flex: 1,
    gap: spacing[1],
  },
  datePickerLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateDisplayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  dateDisplayButtonPressed: {
    backgroundColor: colors.border,
  },
  dateDisplayText: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium as '500',
  },

  // Period cards
  periodsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },

  // Top clients
  topSection: {
    gap: spacing[2],
  },
  topSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[1],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRank: {
    width: 20,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold as '700',
    color: colors.textDisabled,
    textAlign: 'center',
  },
  topName: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium as '500',
    color: colors.textPrimary,
  },
  topBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    minWidth: 32,
    alignItems: 'center',
  },
  topBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as '700',
    color: colors.primary,
  },

  // Empty state
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
    lineHeight: 24,
  },

  // Admin user selector
  userSelectorSection: {
    gap: spacing[2],
  },
  userSelectorLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  userPillsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingBottom: spacing[1],
  },
  userPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 36,
    justifyContent: 'center',
  },
  userPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  userPillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
    maxWidth: 120,
  },
  userPillTextSelected: {
    color: colors.textOnPrimary,
  },
})
