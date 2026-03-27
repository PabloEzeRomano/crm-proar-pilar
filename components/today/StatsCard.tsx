/**
 * StatsModal — EP-018 (story 18.3)
 *
 * Bottom-sheet-style modal with visit statistics.
 * Triggered by the chart icon in the Today screen header.
 *
 * Shows:
 *   - Week and month visit counts + completion rates (18.1)
 *   - Top clients by visit frequency (18.2)
 */

import React from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { borderRadius, colors, fontSize, fontWeight, shadows, spacing } from '@/constants/theme'
import { VisitStats } from '@/hooks/useVisitStats'

interface StatsModalProps {
  visible: boolean
  onClose: () => void
  stats: VisitStats
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
  completed: number
  pending: number
  completionRate: number
}

function PeriodCard({ label, total, completed, pending, completionRate }: PeriodCardProps) {
  const rateColor =
    completionRate >= 75 ? colors.success : completionRate >= 50 ? colors.warning : colors.error

  return (
    <View style={pcStyles.card}>
      <Text style={pcStyles.label}>{label}</Text>
      <Text style={pcStyles.total}>
        {total}
        <Text style={pcStyles.unit}> {total === 1 ? 'visita' : 'visitas'}</Text>
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
        <ProgressBar rate={completionRate} />
        <Text style={[pcStyles.rateText, { color: rateColor }]}>{completionRate}%</Text>
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

export function StatsModal({ visible, onClose, stats }: StatsModalProps) {
  const hasData = stats.week.total > 0 || stats.month.total > 0

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
          {hasData ? (
            <>
              {/* Period cards */}
              <View style={styles.periodsRow}>
                <PeriodCard
                  label="Esta semana"
                  total={stats.week.total}
                  completed={stats.week.completed}
                  pending={stats.week.pending}
                  completionRate={stats.week.completionRate}
                />
                <PeriodCard
                  label="Este mes"
                  total={stats.month.total}
                  completed={stats.month.completed}
                  pending={stats.month.pending}
                  completionRate={stats.month.completionRate}
                />
              </View>

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
                No hay datos de visitas cargadas aún.{'\n'}Las estadísticas aparecerán automáticamente.
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
    maxHeight: '75%',
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
})
