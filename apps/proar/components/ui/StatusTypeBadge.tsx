/**
 * StatusBadge.tsx — Shared status indicator component
 *
 * Renders a colored badge with icon + label for visit status.
 * Used across visit/client screens to consolidate status display logic.
 */

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

type BadgeConfig = Record<
  VisitStatus | VisitType,
  {
    bg: string;
    color: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
  }
>;

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
  customer_service: {
    icon: 'headset' as const,
    color: visitTypeColors.customer_service,
    bg: visitTypeColors.customer_serviceLight,
  },
  quote: {
    icon: 'file-document-outline' as const,
    color: visitTypeColors.quote,
    bg: visitTypeColors.quoteLight,
  },
  sales_orders: {
    icon: 'cart-outline' as const,
    color: visitTypeColors.sales_orders,
    bg: visitTypeColors.sales_ordersLight,
  },
  new_projects: {
    icon: 'lightbulb-outline' as const,
    color: visitTypeColors.new_projects,
    bg: visitTypeColors.new_projectsLight,
  },
  payments: {
    icon: 'credit-card-outline' as const,
    color: visitTypeColors.payments,
    bg: visitTypeColors.paymentsLight,
  },
  technical_service: {
    icon: 'wrench-outline' as const,
    color: visitTypeColors.technical_service,
    bg: visitTypeColors.technical_serviceLight,
  },
  other: {
    icon: 'dots-horizontal-circle-outline' as const,
    color: visitTypeColors.other,
    bg: visitTypeColors.otherLight,
  },
} as const;

interface StatusTypeBadgeProps {
  status?: VisitStatus;
  type: VisitType;
  isStatus?: boolean;
}

export function StatusTypeBadge({ status, type }: StatusTypeBadgeProps) {
  const config = STATUS_TYPE_CONFIG[status ?? type];
  const label = getStatusLabel(type, status);
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bg },
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
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
