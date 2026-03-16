/**
 * StatusBadge.tsx — Shared status indicator component
 *
 * Renders a colored badge with icon + label for visit status.
 * Used across visit/client screens to consolidate status display logic.
 */

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { VisitStatus } from '@/types'
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/constants/theme'

export const STATUS_CONFIG = {
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

interface StatusBadgeProps {
  status: VisitStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      <MaterialCommunityIcons name={config.icon} size={14} color={config.text} />
      <Text style={[styles.label, { color: config.text }]}>{config.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.full,
    gap: spacing[1],
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
  },
})
