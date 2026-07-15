import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProspectsStore } from '@/stores/prospectsStore';
import {
  STAGE_LABELS,
  PRODUCT_LABELS,
  type Prospect,
} from '@/types';
import {
  colors,
  stageColors,
  productColors,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  shadows,
} from '@/constants/theme';
import dayjs from '@/lib/dayjs';

function ProspectRow({ prospect }: { prospect: Prospect }) {
  const router = useRouter();
  const sc = stageColors[prospect.stage];
  const pc = productColors[prospect.product];
  const isOverdue =
    prospect.next_follow_up &&
    dayjs(prospect.next_follow_up).isBefore(dayjs(), 'day');

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/(tabs)/prospects/${prospect.id}` as any)}
    >
      <View style={styles.rowMain}>
        <Text style={styles.rowName} numberOfLines={1}>
          {prospect.name}
        </Text>
        {prospect.company_name ? (
          <Text style={styles.rowCompany} numberOfLines={1}>
            {prospect.company_name}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowMeta}>
        <View style={[styles.badge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.badgeText, { color: sc.text }]}>
            {STAGE_LABELS[prospect.stage]}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: pc.bg }]}>
          <Text style={[styles.badgeText, { color: pc.text }]}>
            {PRODUCT_LABELS[prospect.product]}
          </Text>
        </View>
        {isOverdue ? (
          <MaterialCommunityIcons
            name="calendar-alert"
            size={16}
            color={colors.error}
          />
        ) : prospect.next_follow_up ? (
          <MaterialCommunityIcons
            name="calendar-clock"
            size={16}
            color={colors.textSecondary}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function ProspectsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const prospects = useProspectsStore((s) => s.prospects);
  const loading = useProspectsStore((s) => s.loading);

  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? prospects.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.company_name?.toLowerCase() ?? '').includes(query.toLowerCase())
      )
    : prospects;

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      {/* Search */}
      <View style={styles.searchRow}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar prospecto..."
          placeholderTextColor={colors.textDisabled}
          clearButtonMode="while-editing"
        />
      </View>

      {loading && prospects.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <ProspectRow prospect={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query ? 'Sin resultados' : 'Sin prospectos todavía'}
            </Text>
          }
        />
      )}

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + spacing[4] }]}
        onPress={() => router.push('/(tabs)/prospects/form' as any)}
        accessibilityRole="button"
        accessibilityLabel="Agregar prospecto"
      >
        <MaterialCommunityIcons name="plus" size={28} color={colors.textOnPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing[3],
    paddingHorizontal: spacing[3],
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { marginRight: spacing[2] },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  list: { paddingHorizontal: spacing[3], paddingBottom: 80 },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: spacing[1] },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: fontSize.base,
    marginTop: spacing[8],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  rowPressed: { opacity: 0.7 },
  rowMain: { flex: 1 },
  rowName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  rowCompany: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    flexShrink: 0,
  },
  badge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
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
