import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
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
import { useBranchesStore } from '@/stores/branchesStore';
import { useReportsStore } from '@/stores/reportsStore';
import { useUsersStore } from '@/stores/usersStore';

function formatPct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <MaterialCommunityIcons
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name={icon as any}
        size={18}
        color={colors.primary}
      />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

interface MetricColumn {
  label: string;
  width: number;
}

const VENDOR_COLS: MetricColumn[] = [
  { label: 'Cont.', width: 48 },
  { label: 'No cont.', width: 56 },
  { label: 'Rech.', width: 48 },
  { label: 'Ventas', width: 52 },
  { label: 'Conv.', width: 48 },
];

function HeaderRow({
  firstLabel,
  cols,
}: {
  firstLabel: string;
  cols: MetricColumn[];
}) {
  return (
    <View style={styles.headerRow}>
      <Text style={[styles.headerCell, styles.nameCell]}>{firstLabel}</Text>
      {cols.map((c) => (
        <Text
          key={c.label}
          style={[styles.headerCell, styles.numCell, { width: c.width }]}
        >
          {c.label}
        </Text>
      ))}
    </View>
  );
}

export default function ReportsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const isAdminOrRoot = profile?.role === 'admin' || profile?.role === 'root';

  const vendors = useReportsStore((s) => s.vendors);
  const branches = useReportsStore((s) => s.branches);
  const financiers = useReportsStore((s) => s.financiers);
  const loading = useReportsStore((s) => s.loading);
  const error = useReportsStore((s) => s.error);
  const fetchReports = useReportsStore((s) => s.fetchReports);

  const users = useUsersStore((s) => s.users);
  const fetchUsers = useUsersStore((s) => s.fetchUsers);
  const branchList = useBranchesStore((s) => s.branches);
  const fetchBranches = useBranchesStore((s) => s.fetchBranches);

  useEffect(() => {
    if (!isAdminOrRoot) return;
    // Load dependencies (users + branches) before aggregating interactions.
    Promise.all([fetchUsers(), fetchBranches()]).then(() => {
      const { users: u } = useUsersStore.getState();
      const { branches: b } = useBranchesStore.getState();
      const branchNames: Record<string, string> = {};
      for (const branch of b) branchNames[branch.id] = branch.name;
      fetchReports(
        u.map((x) => ({
          id: x.id,
          full_name: x.full_name,
          branch_id: x.branch_id,
        })),
        branchNames
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep linter happy about unused selector reads — they trigger re-renders.
  void users;
  void branchList;

  if (!isAdminOrRoot) {
    return (
      <View style={styles.guard}>
        <MaterialCommunityIcons
          name="lock-outline"
          size={48}
          color={colors.textDisabled}
        />
        <Text style={styles.guardText}>Sin acceso</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const maxFinancierSales = financiers.reduce(
    (max, f) => Math.max(max, f.sales),
    0
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Per vendedor */}
      <SectionTitle icon="account-tie" title="Por colaborador" />
      <View style={styles.tableCard}>
        <HeaderRow firstLabel="Colaborador" cols={VENDOR_COLS} />
        {vendors.length === 0 ? (
          <Text style={styles.emptyText}>Sin gestiones registradas</Text>
        ) : (
          vendors.map((v) => (
            <View key={v.userId} style={styles.dataRow}>
              <View style={styles.nameCell}>
                <Text style={styles.nameText} numberOfLines={1}>
                  {v.name}
                </Text>
                <Text style={styles.subText} numberOfLines={1}>
                  {v.branchName}
                </Text>
              </View>
              <Text style={[styles.numCell, { width: VENDOR_COLS[0].width }]}>
                {v.contacted}
              </Text>
              <Text style={[styles.numCell, { width: VENDOR_COLS[1].width }]}>
                {v.notContacted}
              </Text>
              <Text style={[styles.numCell, { width: VENDOR_COLS[2].width }]}>
                {v.rejected}
              </Text>
              <Text
                style={[
                  styles.numCell,
                  styles.salesCell,
                  { width: VENDOR_COLS[3].width },
                ]}
              >
                {v.sales}
              </Text>
              <Text
                style={[
                  styles.numCell,
                  styles.convCell,
                  { width: VENDOR_COLS[4].width },
                ]}
              >
                {formatPct(v.conversionRate)}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Per sucursal */}
      <SectionTitle icon="office-building" title="Por sucursal" />
      <View style={styles.tableCard}>
        <HeaderRow firstLabel="Sucursal" cols={VENDOR_COLS} />
        {branches.length === 0 ? (
          <Text style={styles.emptyText}>Sin gestiones registradas</Text>
        ) : (
          branches.map((b) => (
            <View key={b.branchId ?? '__none__'} style={styles.dataRow}>
              <View style={styles.nameCell}>
                <Text style={styles.nameText} numberOfLines={1}>
                  {b.branchName}
                </Text>
              </View>
              <Text style={[styles.numCell, { width: VENDOR_COLS[0].width }]}>
                {b.contacted}
              </Text>
              <Text style={[styles.numCell, { width: VENDOR_COLS[1].width }]}>
                {b.notContacted}
              </Text>
              <Text style={[styles.numCell, { width: VENDOR_COLS[2].width }]}>
                {b.rejected}
              </Text>
              <Text
                style={[
                  styles.numCell,
                  styles.salesCell,
                  { width: VENDOR_COLS[3].width },
                ]}
              >
                {b.sales}
              </Text>
              <Text
                style={[
                  styles.numCell,
                  styles.convCell,
                  { width: VENDOR_COLS[4].width },
                ]}
              >
                {formatPct(b.conversionRate)}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Per financiera */}
      <SectionTitle icon="bank" title="Ventas por financiera" />
      <View style={styles.tableCard}>
        {financiers.length === 0 ? (
          <Text style={styles.emptyText}>Sin ventas registradas</Text>
        ) : (
          financiers.map((f) => (
            <View key={f.name} style={styles.financierRow}>
              <View style={styles.financierHeader}>
                <Text style={styles.nameText} numberOfLines={1}>
                  {f.name}
                </Text>
                <Text style={styles.financierCount}>{f.sales}</Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${
                        maxFinancierSales > 0
                          ? (f.sales / maxFinancierSales) * 100
                          : 0
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))
        )}
      </View>

      <Text style={styles.footnote}>
        Sucursal atribuida según la sucursal actual del colaborador.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing[4], paddingBottom: spacing[20] },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  guard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.background,
  },
  guardText: { fontSize: fontSize.base, color: colors.textSecondary },
  errorText: {
    fontSize: fontSize.base,
    color: colors.error,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    padding: spacing[3],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    ...shadows.subtle,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerCell: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nameCell: { flex: 1, paddingRight: spacing[2], gap: 2 },
  nameText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  subText: { fontSize: fontSize.xs, color: colors.textSecondary },
  numCell: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  salesCell: { fontWeight: fontWeight.bold, color: colors.success },
  convCell: { fontWeight: fontWeight.semibold, color: colors.primary },
  financierRow: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing[2],
  },
  financierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  financierCount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  barTrack: {
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  footnote: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginTop: spacing[4],
    textAlign: 'center',
  },
});
