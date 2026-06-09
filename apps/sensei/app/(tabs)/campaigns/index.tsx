import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  shadows,
  spacing,
} from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useCampaignsStore } from '@/stores/campaignsStore';
import type { Campaign, CampaignStatus } from '@/types';

const STATUS_TABS: { key: 'all' | CampaignStatus; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Activas' },
  { key: 'paused', label: 'Pausadas' },
  { key: 'completed', label: 'Completadas' },
];

const statusLabel: Record<CampaignStatus, string> = {
  active: 'Activa',
  paused: 'Pausada',
  completed: 'Completada',
};

const statusColor: Record<CampaignStatus, string> = {
  active: colors.success,
  paused: colors.warning,
  completed: colors.statusCanceled,
};

function CampaignRow({ campaign, onPress }: { campaign: Campaign; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name="bullhorn-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowName} numberOfLines={1}>{campaign.name}</Text>
        {campaign.description && (
          <Text style={styles.rowSub} numberOfLines={1}>{campaign.description}</Text>
        )}
      </View>
      <View style={[styles.badge, { backgroundColor: statusColor[campaign.status] + '20' }]}>
        <Text style={[styles.badgeText, { color: statusColor[campaign.status] }]}>
          {statusLabel[campaign.status]}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textDisabled} />
    </Pressable>
  );
}

export default function CampaignsScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const isAdminOrRoot = profile?.role === 'admin' || profile?.role === 'root';

  const campaigns = useCampaignsStore((s) => s.campaigns);
  const loading = useCampaignsStore((s) => s.loading);
  const fetchCampaigns = useCampaignsStore((s) => s.fetchCampaigns);

  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'all' | CampaignStatus>('all');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const filtered = useMemo(() => {
    let list = campaigns;
    if (statusTab !== 'all') list = list.filter((c) => c.status === statusTab);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [campaigns, statusTab, search]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar campaña…"
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.tabs}>
        {STATUS_TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, statusTab === tab.key && styles.tabActive]}
            onPress={() => setStatusTab(tab.key)}
            accessibilityRole="tab"
          >
            <Text style={[styles.tabText, statusTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                {search.trim() ? 'Sin resultados' : 'No hay campañas'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <CampaignRow
              campaign={item}
              onPress={() => router.push(`/campaigns/${item.id}`)}
            />
          )}
        />
      )}

      {isAdminOrRoot && (
        <Pressable
          style={styles.fab}
          onPress={() => router.push('/campaigns/new')}
          accessibilityRole="button"
          accessibilityLabel="Nueva campaña"
        >
          <MaterialCommunityIcons name="plus" size={28} color={colors.textOnPrimary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    marginBottom: spacing[2],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[2],
    ...shadows.subtle,
  },
  searchInput: { flex: 1, fontSize: fontSize.base, color: colors.textPrimary, height: 36 },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing[4], gap: spacing[2], marginBottom: spacing[3] },
  tab: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    minHeight: 36,
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
  tabTextActive: { color: colors.textOnPrimary, fontWeight: fontWeight.semibold },
  listContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[20] },
  separator: { height: spacing[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[3],
    ...shadows.subtle,
    minHeight: 56,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1, gap: 2 },
  rowName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  rowSub: { fontSize: fontSize.sm, color: colors.textSecondary },
  badge: { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: borderRadius.full },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing[12] },
  emptyText: { fontSize: fontSize.base, color: colors.textSecondary },
  fab: {
    position: 'absolute',
    bottom: spacing[6],
    right: spacing[4],
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.subtle,
  },
});
