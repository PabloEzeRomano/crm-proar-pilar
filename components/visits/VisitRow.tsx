/**
 * components/visits/VisitRow.tsx — Shared visit row card
 *
 * Consistent visit row used across Agenda, Visits list, and Team screens.
 * Handles overdue / completed / canceled visual states internally.
 * Web: adds cursor:pointer via Platform check.
 */

import React from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import dayjs from '@/lib/dayjs'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  shadows,
  spacing,
} from '@/constants/theme'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { VisitWithClient } from '@/types'

export interface VisitRowProps {
  visit: VisitWithClient
  onPress: () => void
  showOwner?: boolean
  showAmount?: boolean
}

export function VisitRow({ visit, onPress, showOwner, showAmount }: VisitRowProps) {
  const scheduledDayjs = dayjs(visit.scheduled_at)

  const isCompleted = visit.status === 'completed'
  const isCanceled = visit.status === 'canceled'
  const isPendingOverdue =
    visit.status === 'pending' && scheduledDayjs.isBefore(dayjs())
  const rowOpacity = isCompleted ? 0.5 : isCanceled ? 0.4 : 1
  const timeColor = isPendingOverdue ? colors.warning : colors.textPrimary

  const clientName = visit.client?.name ?? 'Cliente desconocido'
  const ownerName =
    showOwner && visit.owner?.full_name
      ? visit.owner.full_name.split(' ')[0]
      : null

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        { opacity: rowOpacity },
        Platform.OS === 'web' && (webStyle as object),
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver visita a ${clientName}`}
    >
      {/* Left: date + time column */}
      <View style={styles.timeColumn}>
        <Text style={styles.dateText}>
          {scheduledDayjs.format('DD/MM')}
        </Text>
        <Text style={[styles.timeText, { color: timeColor }]}>
          {scheduledDayjs.format('HH:mm')}
        </Text>
      </View>

      {/* Center: client name + optional owner */}
      <View style={styles.content}>
        <Text style={styles.clientName} numberOfLines={1}>
          {clientName}
        </Text>
        {ownerName ? (
          <Text style={styles.ownerText} numberOfLines={1}>
            {ownerName}
          </Text>
        ) : null}
      </View>

      {/* Right: fixed-width column so all rows align consistently */}
      <View style={styles.right}>
        {showAmount && visit.amount != null ? (
          <Text style={styles.amountText}>
            ${visit.amount.toLocaleString('es-AR')}
          </Text>
        ) : null}
        <StatusBadge status={visit.status} type={visit.type} />
      </View>
    </Pressable>
  )
}

// Web-only style: cursor pointer. Defined outside StyleSheet to avoid TS error.
const webStyle = { cursor: 'pointer' }

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[3],
    ...shadows.subtle,
    minHeight: 64,
  },
  cardPressed: {
    backgroundColor: colors.background,
  },
  timeColumn: {
    width: 48,
    flexShrink: 0,
    gap: spacing[1],
    alignSelf: 'center',
  },
  dateText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },
  timeText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold as '700',
  },
  content: {
    flex: 1,
    gap: spacing[1],
    justifyContent: 'center',
    alignSelf: 'center',
  },
  clientName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  ownerText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  right: {
    minWidth: 112,
    flexShrink: 0,
    alignSelf: 'center',
    alignItems: 'flex-start',
    gap: spacing[1],
  },
  amountText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
})
