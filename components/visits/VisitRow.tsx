/**
 * components/visits/VisitRow.tsx — Shared visit row card
 *
 * 4-column grid:
 *   Col 1 (fixed 48px) — date + time
 *   Col 2 (flex)       — client name + owner name
 *   Col 3 (flex)       — notes preview, web only, opt-in via showNotes
 *   Col 4 (fixed)      — type chip + amount + status badge
 */

import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface VisitRowProps {
  visit: VisitWithClient;
  onPress: () => void;
  showOwner?: boolean;
  showAmount?: boolean;
  showType?: boolean;
  showNotes?: boolean;
}

const webStyle = { cursor: 'pointer' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

  console.log(visit);

  const notesSnippet =
    showNotes && Platform.OS === 'web' && visit.notes
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
        Platform.OS === 'web' && (webStyle as object),
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver visita a ${clientName}`}
    >
      {/* Col 1: date + time */}
      <View style={styles.timeColumn}>
        <Text style={styles.dateText}>{scheduledDayjs.format('DD/MM')}</Text>
        <Text style={[styles.timeText, { color: timeColor }]}>
          {scheduledDayjs.format('HH:mm')}
        </Text>
      </View>

      {/* Col 2: client name + owner — narrower on web so col 3 has more room */}
      <View
        style={[
          styles.clientColumn,
          Platform.OS === 'web' && styles.clientColumnWeb,
        ]}
      >
        <Text style={styles.clientName} numberOfLines={1}>
          {clientName}
        </Text>
        {ownerName ? (
          <Text style={styles.ownerText} numberOfLines={1}>
            {ownerName}
          </Text>
        ) : null}
      </View>

      {/* Col 3: notes preview — web only, no space allocated on mobile */}
      <View style={styles.notesColumn}>
        {Platform.OS === 'web' && notesSnippet ? (
          <Text style={styles.notesText} numberOfLines={2}>
            {notesSnippet}
          </Text>
        ) : null}
        {visit.amount != null ? (
          <Text style={styles.amountText}>
            ${visit.amount.toLocaleString('es-AR')}
          </Text>
        ) : null}
      </View>

      {/* Col 4: type chip + amount + status badge */}
      <View style={styles.rightColumn}>
        {showType ? <StatusTypeBadge type={visit.type} /> : null}

        <StatusTypeBadge status={visit.status} type={visit.type} />
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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

  // Col 1
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

  // Col 2 — mobile: flex 1 (col 3 absent); web: narrower via clientColumnWeb
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

  // Col 3 — web only
  notesColumn: {
    flex: 1.4,
  },
  notesText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.5,
  },

  // Col 4
  rightColumn: {
    flex: 0.15,
    flexShrink: 0,
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  typeChipLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium as '500',
  },
  amountText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
});
