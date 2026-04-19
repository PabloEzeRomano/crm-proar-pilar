/**
 * app/(tabs)/team/index.tsx — Team user list (admin/root only)
 *
 * Shows all users in the company. Tapping a row navigates to the
 * per-user drill-down screen at /(tabs)/team/[userId].
 *
 * Access-guarded: non-admin/root users see a lock screen.
 * All data flows through useUsersStore and useVisitsStore.
 * No direct Supabase calls.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import dayjs from '@/lib/dayjs';
import { useAuthStore } from '@/stores/authStore';
import { useUsersStore } from '@/stores/usersStore';
import { useVisitsStore } from '@/stores/visitsStore';
import type { UserRole } from '@/types';

// ---------------------------------------------------------------------------
// Role badge
// ---------------------------------------------------------------------------

const ROLE_LABEL: Record<UserRole, string> = {
  user: 'Usuario',
  admin: 'Admin',
  root: 'Root',
};

const ROLE_COLOR: Record<UserRole, string> = {
  user: colors.textSecondary,
  admin: colors.primary,
  root: colors.error,
};

const ROLE_BG: Record<UserRole, string> = {
  user: colors.surface,
  admin: colors.primaryLight ?? '#EFF6FF',
  root: '#FEE2E2',
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <View style={[styles.roleBadge, { backgroundColor: ROLE_BG[role] }]}>
      <Text style={[styles.roleBadgeText, { color: ROLE_COLOR[role] }]}>
        {ROLE_LABEL[role]}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TeamIndexScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const users = useUsersStore((s) => s.users);
  const loading = useUsersStore((s) => s.loading);
  const error = useUsersStore((s) => s.error);
  const fetchUsers = useUsersStore((s) => s.fetchUsers);

  const allVisits = useVisitsStore((s) => s.allVisits);
  const allVisitsLoading = useVisitsStore((s) => s.allVisitsLoading);
  const fetchAllVisitsForAdmin = useVisitsStore(
    (s) => s.fetchAllVisitsForAdmin,
  );

  const isAdminOrRoot = profile?.role === 'admin' || profile?.role === 'root';

  const [selectedType, setSelectedType] = useState<'quote' | 'sale'>('quote');

  useEffect(() => {
    if (!isAdminOrRoot) return;
    fetchUsers();
    fetchAllVisitsForAdmin();
  }, []);

  if (!isAdminOrRoot) {
    return (
      <View style={styles.guardContainer}>
        <MaterialCommunityIcons
          name="lock-outline"
          size={48}
          color={colors.textDisabled}
        />
        <Text style={styles.guardText}>No tenés acceso a esta sección</Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Summary stats (current month)
  // ---------------------------------------------------------------------------

  const now = dayjs();
  const thisMonthVisits = allVisits.filter((v) =>
    dayjs(v.scheduled_at).isSame(now, 'month'),
  );
  const quotesThisMonth = thisMonthVisits.filter((v) => v.type === 'quote');
  const salesThisMonth = thisMonthVisits.filter((v) => v.type === 'sale');
  const quoteAmountTotal = quotesThisMonth.reduce(
    (s, v) => s + (v.amount ?? 0),
    0,
  );
  const saleAmountTotal = salesThisMonth.reduce(
    (s, v) => s + (v.amount ?? 0),
    0,
  );

  // ---------------------------------------------------------------------------
  // Filtered visit list
  // ---------------------------------------------------------------------------

  const filteredVisits = allVisits.filter((v) => v.type === selectedType);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* ── Summary cards (current month) ─────────────────────────────── */}
      {!allVisitsLoading && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Gestiones — {now.format('MMMM YYYY')}
            </Text>
          </View>

          <View style={styles.cardsRow}>
            {/* Cotizaciones card */}
            <View style={[styles.statCard, styles.statCardQuote]}>
              <Text style={styles.statCardLabel}>Cotizaciones</Text>
              <Text style={[styles.statCardCount, styles.statCardCountQuote]}>
                {quotesThisMonth.length}
              </Text>
              <Text style={[styles.statCardAmount, styles.statCardAmountQuote]}>
                ${quoteAmountTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </Text>
            </View>

            {/* Ventas card */}
            <View style={[styles.statCard, styles.statCardSale]}>
              <Text style={styles.statCardLabel}>Ventas</Text>
              <Text style={[styles.statCardCount, styles.statCardCountSale]}>
                {salesThisMonth.length}
              </Text>
              <Text style={[styles.statCardAmount, styles.statCardAmountSale]}>
                ${saleAmountTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </Text>
            </View>
          </View>

          {/* ── Segmented control ───────────────────────────────────────── */}
          <View style={styles.segmentedControl}>
            <Pressable
              style={[
                styles.segmentButton,
                selectedType === 'quote' && styles.segmentButtonActive,
              ]}
              onPress={() => setSelectedType('quote')}
              accessibilityRole="button"
              accessibilityLabel="Ver cotizaciones"
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  selectedType === 'quote' && styles.segmentButtonTextActive,
                ]}
              >
                Cotizaciones
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentButton,
                selectedType === 'sale' && styles.segmentButtonActive,
              ]}
              onPress={() => setSelectedType('sale')}
              accessibilityRole="button"
              accessibilityLabel="Ver ventas"
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  selectedType === 'sale' && styles.segmentButtonTextActive,
                ]}
              >
                Ventas
              </Text>
            </Pressable>
          </View>

          {/* ── Filtered visit list ─────────────────────────────────────── */}
          {filteredVisits.length === 0 ? (
            <View style={styles.emptyVisitsContainer}>
              <Text style={styles.emptyText}>
                No hay {selectedType === 'quote' ? 'cotizaciones' : 'ventas'}{' '}
                registradas
              </Text>
            </View>
          ) : (
            <View style={styles.visitList}>
              {filteredVisits.map((v) => (
                <VisitRow
                  key={v.id}
                  visit={v}
                  onPress={() => router.push(`/visits/${v.id}` as never)}
                  showOwner
                  showAmount={v.type === 'quote' || v.type === 'sale'}
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  separator: {
    height: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[3],
    ...shadows.subtle,
    minHeight: 64,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight ?? '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold as '700',
    color: colors.primary,
  },
  rowContent: {
    flex: 1,
    gap: spacing[1],
  },
  rowName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    minHeight: 28,
    justifyContent: 'center',
  },
  roleBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
  },
  loadingContainer: {
    paddingVertical: spacing[6],
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: spacing[6],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.error,
    textAlign: 'center',
  },
  emptyContainer: {
    paddingVertical: spacing[12],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
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

  // Section header
  sectionHeader: {
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  // Summary cards
  cardsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  statCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[1],
    ...shadows.subtle,
  },
  statCardQuote: {
    backgroundColor: colors.primaryLight,
  },
  statCardSale: {
    backgroundColor: colors.successLight,
  },
  statCardLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statCardCount: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold as '700',
  },
  statCardCountQuote: {
    color: colors.primary,
  },
  statCardCountSale: {
    color: colors.success,
  },
  statCardAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
  },
  statCardAmountQuote: {
    color: colors.primary,
  },
  statCardAmountSale: {
    color: colors.success,
  },

  // Segmented control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 2,
    marginBottom: spacing[3],
  },
  segmentButton: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  segmentButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },
  segmentButtonTextActive: {
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold as '600',
  },

  // Visit list
  visitList: {
    gap: spacing[2],
  },
  emptyVisitsContainer: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
});
