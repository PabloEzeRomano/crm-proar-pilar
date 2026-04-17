/**
 * StatusBadge.tsx — Shared status indicator component
 *
 * Renders a colored badge with icon + label for visit status.
 * Used across visit/client screens to consolidate status display logic.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VisitStatus, VisitType } from '@/types';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
  visitTypeColors,
} from '@/constants/theme';
import { getStatusLabel } from '@/lib/visitStatus';

type BadgeConfig = Record<VisitStatus | VisitType, {
  bg: string;
  color: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}>;

const STATUS_TYPE_CONFIG: BadgeConfig = {
  pending: {
    bg: colors.statusPendingLight,
    color: colors.statusPending,
    icon: 'clock-outline' as const,
  },
  completed: {
    bg: colors.statusCompletedLight,
    color: colors.statusCompleted,
    icon: 'check-circle-outline' as const,
  },
  canceled: {
    bg: colors.statusCanceledLight,
    color: colors.statusCanceled,
    icon: 'close-circle-outline' as const,
  },
  visit: {
    icon: 'briefcase-outline' as const,
    color: visitTypeColors.visit,
    bg: visitTypeColors.visitLight,
  },
  call: {
    icon: 'phone-outline' as const,
    color: visitTypeColors.call,
    bg: visitTypeColors.callLight,
  },
  quote: {
    icon: 'file-document-outline' as const,
    color: visitTypeColors.quote,
    bg: visitTypeColors.quoteLight,
  },
  sale: {
    icon: 'cash-register' as const,
    color: visitTypeColors.sale,
    bg: visitTypeColors.saleLight,
  },
} as const;


interface StatusTypeBadgeProps {
  status?: VisitStatus;
  type: VisitType;
  isStatus?: boolean;
}

export function StatusTypeBadge({ status, type}: StatusTypeBadgeProps) {
  const config = STATUS_TYPE_CONFIG[status ?? type];
  const label = getStatusLabel(type, status);
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bg, borderColor: config.color },
      ]}
    >
      <MaterialCommunityIcons
        name={config.icon}
        size={14}
        color={config.color}
      />
      <Text style={[styles.label, { color: config.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
  },
});
