import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { brand } from '@/constants/brand';
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
import { useAssignmentsStore } from '@/stores/assignmentsStore';
import { useInteractionsStore } from '@/stores/interactionsStore';

type MCIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface StatCardProps {
  icon: MCIconName;
  label: string;
  value: number;
  color: string;
  bgColor: string;
  onPress?: () => void;
}

function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
  onPress,
}: StatCardProps) {
  return (
    <Pressable
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.statIcon, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

function CampaignQuickCard({
  name,
  status,
  assignments,
  onPress,
}: {
  name: string;
  status: string;
  assignments: number;
  onPress: () => void;
}) {
  const statusColors: Record<string, string> = {
    active: colors.success,
    paused: colors.warning,
    completed: colors.statusCanceled,
  };

  return (
    <Pressable style={styles.campaignCard} onPress={onPress}>
      <View style={styles.campaignHeader}>
        <Text style={styles.campaignName} numberOfLines={1}>
          {name}
        </Text>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: statusColors[status] ?? colors.textDisabled },
          ]}
        />
      </View>
      <Text style={styles.campaignMeta}>{assignments} asignaciones</Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'root';

  const campaigns = useCampaignsStore((s) => s.campaigns);
  const campaignsLoading = useCampaignsStore((s) => s.loading);
  const fetchCampaignsWithStats = useCampaignsStore(
    (s) => s.fetchCampaignsWithStats
  );
  const campaignsWithStats = useCampaignsStore((s) => s.campaignsWithStats);

  const interactions = useInteractionsStore((s) => s.interactions);
  const fetchMyInteractions = useInteractionsStore(
    (s) => s.fetchMyInteractions
  );

  const assignments = useAssignmentsStore((s) => s.assignments);
  const fetchMyAssignments = useAssignmentsStore((s) => s.fetchMyAssignments);

  useEffect(() => {
    if (isAdmin) {
      fetchCampaignsWithStats();
    } else {
      useCampaignsStore.getState().fetchCampaigns();
      fetchMyAssignments();
    }
    fetchMyInteractions();
  }, []);

  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const myPending = assignments.filter((a) => a.status === 'pending').length;
  const myInProgress = assignments.filter(
    (a) => a.status === 'in_progress'
  ).length;
  const todayInteractions = interactions.filter((i) => {
    const today = new Date().toISOString().slice(0, 10);
    return i.created_at.slice(0, 10) === today;
  }).length;

  // Admin stats from campaignsWithStats
  const totalAssignments = campaignsWithStats.reduce(
    (sum, c) => sum + c.total_assignments,
    0
  );
  const totalContacted = campaignsWithStats.reduce(
    (sum, c) => sum + c.contacted,
    0
  );
  const totalSales = campaignsWithStats.reduce((sum, c) => sum + c.sales, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.title}>{brand.appName}</Text>
      <Text style={styles.subtitle}>
        {profile?.full_name ? `Hola, ${profile.full_name}` : 'Dashboard'}
      </Text>

      {campaignsLoading ? (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{ marginTop: spacing[8] }}
        />
      ) : (
        <>
          {/* Stats grid */}
          <View style={styles.statsGrid}>
            {isAdmin ? (
              <>
                <StatCard
                  icon="bullhorn"
                  label="Campañas activas"
                  value={activeCampaigns.length}
                  color={colors.primary}
                  bgColor={colors.primaryLight}
                  onPress={() => router.push('/campaigns')}
                />
                <StatCard
                  icon="account-group"
                  label="Total asignaciones"
                  value={totalAssignments}
                  color="#6366F1"
                  bgColor="#EEF2FF"
                />
                <StatCard
                  icon="phone-check"
                  label="Contactados"
                  value={totalContacted}
                  color={colors.success}
                  bgColor={colors.successLight}
                />
                <StatCard
                  icon="cash-check"
                  label="Ventas"
                  value={totalSales}
                  color="#7C3AED"
                  bgColor="#EDE9FE"
                />
              </>
            ) : (
              <>
                <StatCard
                  icon="clipboard-clock-outline"
                  label="Pendientes"
                  value={myPending}
                  color={colors.warning}
                  bgColor={colors.warningLight}
                />
                <StatCard
                  icon="clipboard-play-outline"
                  label="En progreso"
                  value={myInProgress}
                  color={colors.primary}
                  bgColor={colors.primaryLight}
                />
                <StatCard
                  icon="clipboard-check"
                  label="Gestiones hoy"
                  value={todayInteractions}
                  color={colors.success}
                  bgColor={colors.successLight}
                  onPress={() => router.push('/interactions')}
                />
                <StatCard
                  icon="bullhorn"
                  label="Campañas activas"
                  value={activeCampaigns.length}
                  color="#6366F1"
                  bgColor="#EEF2FF"
                />
              </>
            )}
          </View>

          {/* Reports entry (admin/root only) */}
          {isAdmin && (
            <Pressable
              style={styles.reportsLink}
              onPress={() => router.push('/dashboard/reports')}
            >
              <View style={styles.reportsIcon}>
                <MaterialCommunityIcons
                  name="chart-bar"
                  size={22}
                  color={colors.primary}
                />
              </View>
              <View style={styles.reportsContent}>
                <Text style={styles.reportsTitle}>Reportes</Text>
                <Text style={styles.reportsSub}>
                  Desempeño por vendedor, sucursal y financiera
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={colors.textSecondary}
              />
            </Pressable>
          )}

          {/* Active campaigns */}
          {activeCampaigns.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Campañas activas</Text>
              {activeCampaigns.slice(0, 5).map((c) => {
                const stats = campaignsWithStats.find((s) => s.id === c.id);
                return (
                  <CampaignQuickCard
                    key={c.id}
                    name={c.name}
                    status={c.status}
                    assignments={stats?.total_assignments ?? 0}
                    onPress={() => router.push(`/campaigns/${c.id}`)}
                  />
                );
              })}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing[4], paddingBottom: spacing[20] },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing[1],
    marginTop: spacing[4],
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing[5],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[3],
    ...shadows.subtle,
    minWidth: '47%',
    flex: 1,
    borderLeftWidth: 3,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: { flex: 1 },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  reportsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[5],
    minHeight: 48,
    ...shadows.subtle,
  },
  reportsIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportsContent: { flex: 1 },
  reportsTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  reportsSub: { fontSize: fontSize.xs, color: colors.textSecondary },
  section: { gap: spacing[3] },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  campaignCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    ...shadows.subtle,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  campaignName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    flex: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  campaignMeta: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
