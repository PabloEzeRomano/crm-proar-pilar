import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { VisitRow } from '@/components/visits/VisitRow';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  shadows,
  spacing,
} from '@/constants/theme';
import { VisitWithClient } from '@/types';

export function ClientGroupCard({
  visits,
  onVisitPress,
  showOwner,
}: {
  visits: VisitWithClient[];
  onVisitPress: (v: VisitWithClient) => void;
  showOwner: boolean;
}) {
  const client = visits[0].client;
  const isThread = Boolean(visits[0].thread_id);
  const threadTitle = isThread ? visits[0].title : null;
  const pending = visits.filter((v) => v.status === 'pending');
  const completed = visits.filter((v) => v.status !== 'pending');
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name={isThread ? 'label-outline' : 'domain'}
          size={16}
          color={colors.textSecondary}
        />
        <View style={styles.headerTextCol}>
          <Text style={styles.clientName} numberOfLines={1}>
            {client.name}
          </Text>
          {threadTitle ? (
            <Text style={styles.threadTitle} numberOfLines={1}>
              {threadTitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>
            {visits.length} gest.
            {pending.length > 0 && ` · ${pending.length} pend.`}
          </Text>
        </View>
      </View>

      {pending.map((visit) => (
        <VisitRow
          key={visit.id}
          visit={visit}
          onPress={() => onVisitPress(visit)}
          showOwner={showOwner}
          showClientName={false}
          variant="row"
        />
      ))}

      {completed.length > 0 && (
        <>
          <Pressable
            style={styles.accordion}
            onPress={() => setExpanded((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Ocultar completadas' : 'Ver completadas'}
          >
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
            <Text style={styles.accordionText}>
              {completed.length} completada{completed.length !== 1 ? 's' : ''}
            </Text>
          </Pressable>

          {expanded &&
            completed.map((visit) => (
              <VisitRow
                key={visit.id}
                visit={visit}
                onPress={() => onVisitPress(visit)}
                showOwner={showOwner}
                showClientName={false}
                variant="row"
              />
            ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  headerTextCol: {
    flex: 1,
    gap: 2,
  },
  clientName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  threadTitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
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
