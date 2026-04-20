/**
 * components/visits/VisitRow.tsx — Shared visit row card
 *
 * 4-column grid:
 *   Col 1 (fixed 48px) — date + time
 *   Col 2 (flex)       — client name + owner name (+ amount on mobile)
 *   Col 3 (flex, web)  — notes preview + amount
 *   Col 4 (fixed)      — type chip + status badge
 */

import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import dayjs from '@/lib/dayjs';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  shadows,
  spacing,
} from '@/constants/theme';
import { StatusTypeBadge } from '@/components/ui/StatusTypeBadge';
import { VisitWithClient } from '@/types';

export interface VisitRowProps {
  visit: VisitWithClient;
  onPress: () => void;
  showOwner?: boolean;
  showAmount?: boolean;
  showType?: boolean;
  showNotes?: boolean;
}

const webStyle = { cursor: 'pointer' };

export function VisitRow({
  visit,
  onPress,
  showOwner,
  showType = true,
  showNotes = true,
}: VisitRowProps) {
  const scheduledDayjs = dayjs(visit.scheduled_at);

  const isCompleted = visit.status === 'completed';
  const isCanceled = visit.status === 'canceled';
  const isPendingOverdue =
    visit.status === 'pending' && scheduledDayjs.isBefore(dayjs());

  const rowOpacity = isCompleted ? 0.5 : isCanceled ? 0.4 : 1;
  const timeColor = isPendingOverdue ? colors.warning : colors.textPrimary;

  const clientName = visit.client?.name ?? 'Cliente desconocido';
  const ownerName =
    showOwner && visit.owner?.full_name ? visit.owner.full_name : null;

  const isWeb = Platform.OS === 'web';

  const notesSnippet =
    showNotes && isWeb && visit.notes
      ? visit.notes.length > 80
        ? visit.notes.slice(0, 100) + '...'
        : visit.notes
      : null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        { opacity: rowOpacity },
        isWeb && (webStyle as object),
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver visita a ${clientName}`}
    >
      <View style={styles.timeColumn}>
        <Text style={styles.dateText}>{scheduledDayjs.format('DD/MM')}</Text>
        <Text style={[styles.timeText, { color: timeColor }]}>
          {scheduledDayjs.format('HH:mm')}
        </Text>
      </View>

      {/* Col 2: client name + owner — narrower on web so col 3 has more room */}
      <View style={[styles.clientColumn, isWeb && styles.clientColumnWeb]}>
        <Text style={styles.clientName} numberOfLines={1}>
          {clientName}
        </Text>
        {ownerName ? (
          <Text style={styles.ownerText} numberOfLines={1}>
            {ownerName}
          </Text>
        ) : null}
        {!isWeb && visit.amount != null ? (
          <Text style={styles.amountText}>
            ${visit.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </Text>
        ) : null}
      </View>

      {/* Col 3: notes + amount — web only */}
      {isWeb && (
        <View style={styles.notesColumn}>
          {notesSnippet ? (
            <Text style={styles.notesText} numberOfLines={2}>
              {notesSnippet}
            </Text>
          ) : null}
          {visit.amount != null ? (
            <Text style={styles.amountText}>
              ${visit.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </Text>
          ) : null}
        </View>
      )}

      {/* Col 4: type chip + status badge */}
      <View style={styles.rightColumn}>
        {showType ? <StatusTypeBadge type={visit.type} /> : null}
        <StatusTypeBadge status={visit.status} type={visit.type} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[2],
    gap: spacing[3],
    ...shadows.subtle,
    minHeight: 56,
  },
  cardPressed: {
    backgroundColor: colors.background,
  },

  timeColumn: {
    width: 48,
    flexShrink: 0,
    gap: spacing[1],
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

  clientColumn: {
    flex: 1,
    gap: spacing[1],
  },
  clientColumnWeb: {
    flex: 0.4,
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

  notesColumn: {
    flex: 1.4,
  },
  notesText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.5,
  },

  rightColumn: {
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: spacing[2],
  },
  amountText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
});
