import { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEmailStore } from '@/stores/emailStore';
import { useProspectsStore } from '@/stores/prospectsStore';
import type { EmailSend } from '@/types';
import { colors, fontSize, fontWeight, spacing, borderRadius, shadows } from '@/constants/theme';
import dayjs from '@/lib/dayjs';

function groupByDate(sends: EmailSend[]): { title: string; data: EmailSend[] }[] {
  const map = new Map<string, EmailSend[]>();
  for (const s of sends) {
    const key = dayjs(s.created_at).format('DD/MM/YYYY');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

function SendRow({ send }: { send: EmailSend }) {
  const prospects = useProspectsStore((s) => s.prospects);
  const prospect = prospects.find((p) => p.id === send.prospect_id);

  return (
    <View style={styles.row}>
      <View style={[styles.statusDot, { backgroundColor: send.status === 'sent' ? colors.success : colors.error }]} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>
            {send.recipient_name ?? send.recipient_email}
          </Text>
          <Text style={styles.rowTime}>{dayjs(send.created_at).format('HH:mm')}</Text>
        </View>
        <Text style={styles.rowEmail} numberOfLines={1}>{send.recipient_email}</Text>
        <Text style={styles.rowSubject} numberOfLines={1}>{send.subject}</Text>
        {prospect ? (
          <View style={styles.prospectTag}>
            <MaterialCommunityIcons name="domain" size={11} color={colors.primary} />
            <Text style={styles.prospectTagText}>{prospect.name}</Text>
          </View>
        ) : null}
        {send.status === 'failed' && send.error_message ? (
          <Text style={styles.errorText} numberOfLines={1}>{send.error_message}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function CorreosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sends = useEmailStore((s) => s.sends);
  const loading = useEmailStore((s) => s.loading);
  const fetchSends = useEmailStore((s) => s.fetchSends);
  const fetchTemplates = useEmailStore((s) => s.fetchTemplates);

  useFocusEffect(
    useCallback(() => {
      fetchSends();
      fetchTemplates();
    }, [])
  );

  const sections = groupByDate(sends);

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      {loading && sends.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[8] }} />
      ) : sends.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="email-arrow-right-outline" size={48} color={colors.textDisabled} />
          <Text style={styles.emptyTitle}>Sin correos enviados</Text>
          <Text style={styles.emptySub}>Los correos que envíes aparecerán acá</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SendRow send={item} />}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled
        />
      )}

      {/* Templates shortcut */}
      <Pressable
        style={[styles.templatesBtn, { bottom: insets.bottom + spacing[4] + 64 }]}
        onPress={() => router.push('/(tabs)/correos/templates' as any)}
      >
        <MaterialCommunityIcons name="email-edit-outline" size={20} color={colors.primary} />
        <Text style={styles.templatesBtnText}>Plantillas</Text>
      </Pressable>

      {/* FAB — compose */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + spacing[4] }]}
        onPress={() => router.push('/(tabs)/correos/compose' as any)}
        accessibilityRole="button"
        accessibilityLabel="Nuevo correo"
      >
        <MaterialCommunityIcons name="email-plus" size={26} color={colors.textOnPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing[3], paddingBottom: spacing[16] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  emptySub: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
  },
  sectionHeaderText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
    gap: spacing[2],
    ...shadows.subtle,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginTop: 6,
    flexShrink: 0,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary, flex: 1 },
  rowTime: { fontSize: fontSize.xs, color: colors.textSecondary },
  rowEmail: { fontSize: fontSize.xs, color: colors.textSecondary },
  rowSubject: { fontSize: fontSize.sm, color: colors.textPrimary, marginTop: 1 },
  prospectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  prospectTagText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium },
  errorText: { fontSize: fontSize.xs, color: colors.error, marginTop: 2 },
  templatesBtn: {
    position: 'absolute',
    right: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 9,
    ...shadows.subtle,
  },
  templatesBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.primary },
  fab: {
    position: 'absolute',
    right: spacing[4],
    zIndex: 10,
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
});
