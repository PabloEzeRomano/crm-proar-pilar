/**
 * components/visits/VisitRow.tsx — Shared visit row card
 *
 * 4-column grid:
 *   Col 1 (fixed 48px) — date + time
 *   Col 2 (flex)       — client name + owner name (+ amount on mobile)
 *   Col 3 (flex, web)  — notes preview + amount
 *   Col 4 (fixed)      — type chip + status badge
 */

import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import dayjs, { fromUTC } from '@/lib/dayjs';
import {
  colors,
  fontSize,
  fontWeight,
  spacing,
  visitTypeColors,
} from '@/constants/theme';
import { StatusTypeBadge } from '@/components/ui/StatusTypeBadge';
import { VisitWithClient } from '@/types';
import { useState } from 'react';

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
  const scheduledDayjs = fromUTC(visit.scheduled_at);
  const [minutaVisible, setMinutaVisible] = useState(false);

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
      ? visit.notes.length > 180
        ? visit.notes.slice(0, 200) + '...'
        : visit.notes
      : null;

  return (
    <>
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        { opacity: rowOpacity, borderLeftColor: visitTypeColors[visit.type] },
        isWeb && (webStyle as object),
      ]}
      onPress={onPress}
      onLongPress={visit.notes ? () => setMinutaVisible(true) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`Ver gestión de ${clientName}`}
    >
      <View style={styles.timeColumn}>
        <Text style={styles.dayText}>
          {scheduledDayjs.format('ddd').toUpperCase()}
        </Text>
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
        {visit.title ? (
          <Text style={styles.visitTitleText} numberOfLines={1}>
            {visit.title}
          </Text>
        ) : null}
        {visit.contact_snapshot?.name ? (
          <Text style={styles.contactText} numberOfLines={1}>
            👤 {visit.contact_snapshot.name}
          </Text>
        ) : null}
        {ownerName ? (
          <Text style={styles.ownerText} numberOfLines={1}>
            {ownerName}
          </Text>
        ) : null}
        {!isWeb && visit.amount != null ? (
          <Text style={styles.amountText}>
            $
            {visit.amount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            USD
          </Text>
        ) : null}
      </View>

      {/* Col 3: notes + amount — web only */}
      {isWeb && (
        <View style={styles.notesColumn}>
          {notesSnippet ? (
            <Text style={styles.notesText} numberOfLines={4}>
              {notesSnippet}
            </Text>
          ) : null}
          {visit.amount != null ? (
            <Text style={styles.amountText}>
              $
              {visit.amount.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              USD
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

    {/* Long-press minuta modal — mobile only */}
    {!isWeb && (
      <Modal
        visible={minutaVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMinutaVisible(false)}
      >
        <Pressable
          style={styles.minutaOverlay}
          onPress={() => setMinutaVisible(false)}
        >
          <View style={styles.minutaSheet}>
            <Text style={styles.minutaHeader}>
              {clientName} · {scheduledDayjs.format('DD/MM HH:mm')}
            </Text>
            <ScrollView style={styles.minutaScroll}>
              <Text style={styles.minutaBody}>{visit.notes}</Text>
            </ScrollView>
            <Pressable
              style={styles.minutaClose}
              onPress={() => setMinutaVisible(false)}
            >
              <Text style={styles.minutaCloseText}>Cerrar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    )}
  </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing[3],
    gap: spacing[3],
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 56,
    borderLeftWidth: 4,
  },
  cardPressed: {
    opacity: 0.85,
  },

  timeColumn: {
    width: 48,
    flexShrink: 0,
    gap: spacing[1],
  },
  dayText: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  dateText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  timeText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
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
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  visitTitleText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  contactText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
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
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },

  minutaOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  minutaSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing[5],
    maxHeight: '70%',
    gap: spacing[3],
  },
  minutaHeader: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  minutaScroll: {
    flexGrow: 0,
  },
  minutaBody: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: fontSize.base * 1.6,
  },
  minutaClose: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  minutaCloseText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
