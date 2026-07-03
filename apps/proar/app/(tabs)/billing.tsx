import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { VisitRow } from '@/components/visits/VisitRow';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  shadows,
  spacing,
} from '@/constants/theme';
import { usePermissions } from '@/hooks/usePermissions';
import dayjs from '@/lib/dayjs';
import { useVisitsStore } from '@/stores/visitsStore';

export default function BillingScreen() {
  const router = useRouter();
  const { isAdminOrRoot } = usePermissions();

  const allVisits = useVisitsStore((s) => s.allVisits);
  const allVisitsLoading = useVisitsStore((s) => s.allVisitsLoading);
  const fetchAllVisitsForAdmin = useVisitsStore((s) => s.fetchAllVisitsForAdmin);

  const [selectedMonth, setSelectedMonth] = useState(() => dayjs().startOf('month'));

  const prevMonth = () => setSelectedMonth((m) => m.subtract(1, 'month'));
  const nextMonth = () =>
    setSelectedMonth((m) => {
      const next = m.add(1, 'month');
      return next.isAfter(dayjs(), 'month') ? m : next;
    });
  const isCurrentMonth = selectedMonth.isSame(dayjs(), 'month');

  useEffect(() => {
    if (!isAdminOrRoot) return;
    fetchAllVisitsForAdmin();
  }, []);

  if (!isAdminOrRoot) {
    return (
      <View style={styles.guardContainer}>
        <MaterialCommunityIcons name="lock-outline" size={48} color={colors.textDisabled} />
        <Text style={styles.guardText}>No tenés acceso a esta sección</Text>
      </View>
    );
  }

  const salesOrders = allVisits.filter(
    (v) =>
      v.type === 'sales_orders' &&
      dayjs(v.scheduled_at).isSame(selectedMonth, 'month')
  );
  const amountTotal = salesOrders.reduce((s, v) => s + (v.amount ?? 0), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {!allVisitsLoading && (
        <>
          {/* ── Stat card with month navigator ─────────────────────────── */}
          <View style={[styles.statCard, styles.statCardSale]}>
            <View style={styles.monthNav}>
              <Pressable
                style={styles.monthNavBtn}
                onPress={prevMonth}
                accessibilityRole="button"
                accessibilityLabel="Mes anterior"
              >
                <MaterialCommunityIcons name="chevron-left" size={22} color={colors.success} />
              </Pressable>
              <Text style={styles.monthNavLabel}>
                {selectedMonth.format('MMMM YYYY').toUpperCase()}
              </Text>
              <Pressable
                style={[styles.monthNavBtn, isCurrentMonth && styles.monthNavBtnDisabled]}
                onPress={nextMonth}
                disabled={isCurrentMonth}
                accessibilityRole="button"
                accessibilityLabel="Mes siguiente"
              >
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={isCurrentMonth ? colors.textDisabled : colors.success}
                />
              </Pressable>
            </View>

            <Text style={styles.statCardLabel}>Ventas y pedidos</Text>
            <Text style={[styles.statCardCount, styles.statCardCountSale]}>
              {salesOrders.length}
            </Text>
            <Text style={[styles.statCardAmount, styles.statCardAmountSale]}>
              $
              {amountTotal.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              USD
            </Text>
          </View>

          {/* ── Sales orders list ───────────────────────────────────────── */}
          {salesOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No hay ventas y pedidos en {selectedMonth.format('MMMM YYYY')}
              </Text>
            </View>
          ) : (
            <View style={styles.visitList}>
              {salesOrders.map((v) => (
                <VisitRow
                  key={v.id}
                  visit={v}
                  onPress={() => router.push(`/visits/${v.id}` as never)}
                  showOwner
                  showAmount={v.type === 'sales_orders'}
                />
              ))}
            </View>
          )}
        </>
      )}

      {allVisitsLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  guardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.background,
  },
  guardText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },

  // Stat card
  statCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[1],
    ...shadows.subtle,
  },
  statCardSale: {
    backgroundColor: colors.successLight,
  },
  statCardLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statCardCount: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
  },
  statCardCountSale: {
    color: colors.success,
  },
  statCardAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  statCardAmountSale: {
    color: colors.success,
  },

  // Month navigator
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavBtnDisabled: {
    opacity: 0.4,
  },
  monthNavLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },

  // Visit list
  visitList: {
    marginHorizontal: -spacing[4],
  },
  emptyContainer: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: spacing[6],
    justifyContent: 'center',
    alignItems: 'center',
  },
});
