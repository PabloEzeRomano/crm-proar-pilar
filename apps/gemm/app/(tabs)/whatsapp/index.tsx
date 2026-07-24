import { useCallback } from 'react';
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

import { useWhatsAppStore } from '@/stores/whatsappStore';
import { useProspectsStore } from '@/stores/prospectsStore';
import type { WhatsAppSend } from '@/types';
import { colors, fontSize, fontWeight, spacing, borderRadius, shadows } from '@/constants/theme';
import dayjs from '@/lib/dayjs';

const WA_GREEN = '#25D366';

function groupByDate(sends: WhatsAppSend[]): { title: string; data: WhatsAppSend[] }[] {
  const map = new Map<string, WhatsAppSend[]>();
  for (const s of sends) {
    const key = dayjs(s.created_at).format('DD/MM/YYYY');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

function SendRow({ send }: { send: WhatsAppSend }) {
  const prospects = useProspectsStore((s) => s.prospects);
  const prospect = prospects.find((p) => p.id === send.prospect_id);

  return (
    <View style={styles.row}>
      <View style={[styles.statusDot, { backgroundColor: send.status === 'sent' ? colors.success : colors.error }]} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>
            {send.recipient_name ?? send.recipient_phone}
          </Text>
          <Text style={styles.rowTime}>{dayjs(send.created_at).format('HH:mm')}</Text>
        </View>
        <Text style={styles.rowPhone} numberOfLines={1}>{send.recipient_phone}</Text>
        <Text style={styles.rowBody2} numberOfLines={2}>{send.body}</Text>
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

export default function WhatsAppScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sends = useWhatsAppStore((s) => s.sends);
  const loadingSends = useWhatsAppStore((s) => s.loadingSends);
  const fetchAllSends = useWhatsAppStore((s) => s.fetchAllSends);

  useFocusEffect(
    useCallback(() => {
      fetchAllSends();
    }, [])
  );

  const sections = groupByDate(sends);

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      {loadingSends && sends.length === 0 ? (
        <ActivityIndicator color={WA_GREEN} style={{ marginTop: spacing[8] }} />
      ) : sends.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="whatsapp" size={48} color={colors.textDisabled} />
          <Text style={styles.emptyTitle}>Sin mensajes enviados</Text>
          <Text style={styles.emptySub}>Los mensajes que envíes aparecerán acá</Text>
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

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + spacing[4] }]}
        onPress={() => router.push('/(tabs)/whatsapp/compose' as any)}
        accessibilityRole="button"
        accessibilityLabel="Nuevo mensaje WhatsApp"
      >
        <MaterialCommunityIcons name="whatsapp" size={26} color="#fff" />
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
  rowPhone: { fontSize: fontSize.xs, color: colors.textSecondary },
  rowBody2: { fontSize: fontSize.sm, color: colors.textPrimary, marginTop: 1 },
  prospectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  prospectTagText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium },
  errorText: { fontSize: fontSize.xs, color: colors.error, marginTop: 2 },
  fab: {
    position: 'absolute',
    right: spacing[4],
    zIndex: 10,
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: WA_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
});
