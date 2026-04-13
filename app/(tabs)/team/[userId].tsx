/**
 * app/(tabs)/team/[userId].tsx — Per-user activity drill-down (admin/root only)
 *
 * Shows visits and clients for a specific team member.
 * Data is fetched into teamVisits / teamClients (separate state keys)
 * to avoid polluting the logged-in user's own data.
 * State is cleared on blur to prevent stale data on re-navigation.
 */

import React, { useCallback, useLayoutEffect } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import dayjs from '@/lib/dayjs'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  shadows,
  spacing,
} from '@/constants/theme'
import { useVisitsStore } from '@/stores/visitsStore'
import { useClientsStore } from '@/stores/clientsStore'
import { useUsersStore } from '@/stores/usersStore'
import { useAuthStore } from '@/stores/authStore'
import { StatusBadge } from '@/components/ui/StatusBadge'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TeamUserDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>()
  const router = useRouter()
  const navigation = useNavigation()

  const profile = useAuthStore((s) => s.profile)
  const isAdminOrRoot = profile?.role === 'admin' || profile?.role === 'root'

  const users = useUsersStore((s) => s.users)
  const teamUser = users.find((u) => u.id === userId)

  const teamVisits = useVisitsStore((s) => s.teamVisits)
  const teamLoading = useVisitsStore((s) => s.teamLoading)
  const fetchVisitsByOwner = useVisitsStore((s) => s.fetchVisitsByOwner)
  const clearTeamVisits = useVisitsStore((s) => s.clearTeamVisits)

  const teamClients = useClientsStore((s) => s.teamClients)
  const teamClientsLoading = useClientsStore((s) => s.teamClientsLoading)
  const fetchClientsByOwner = useClientsStore((s) => s.fetchClientsByOwner)
  const clearTeamClients = useClientsStore((s) => s.clearTeamClients)

  // Update header title to show user's name
  useLayoutEffect(() => {
    if (teamUser?.full_name) {
      navigation.setOptions({ title: teamUser.full_name })
    }
  }, [navigation, teamUser?.full_name])

  // Fetch on focus, clear on blur to avoid stale data
  useFocusEffect(
    useCallback(() => {
      if (!userId || !isAdminOrRoot) return
      fetchVisitsByOwner(userId)
      fetchClientsByOwner(userId)
      return () => {
        clearTeamVisits()
        clearTeamClients()
      }
    }, [userId, isAdminOrRoot]),
  )

  if (!isAdminOrRoot) {
    return (
      <View style={styles.guardContainer}>
        <MaterialCommunityIcons name="lock-outline" size={48} color={colors.textDisabled} />
        <Text style={styles.guardText}>No tenés acceso a esta sección</Text>
      </View>
    )
  }

  const completedCount = teamVisits.filter((v) => v.status === 'completed').length

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Stats summary */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{teamVisits.length}</Text>
          <Text style={styles.statLabel}>visita{teamVisits.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.statusCompleted }]}>
            {completedCount}
          </Text>
          <Text style={styles.statLabel}>completada{completedCount !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{teamClients.length}</Text>
          <Text style={styles.statLabel}>cliente{teamClients.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Visits section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Visitas</Text>
          {teamLoading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        {teamVisits.length === 0 && !teamLoading ? (
          <View style={styles.emptySmall}>
            <Text style={styles.emptySmallText}>Sin visitas registradas</Text>
          </View>
        ) : (
          <View style={styles.itemList}>
            {teamVisits.map((visit) => {
              const clientName = visit.client?.name ?? 'Cliente desconocido'
              const dateText = dayjs(visit.scheduled_at).format('ddd D MMM · HH:mm')
              const stripColor =
                visit.status === 'completed'
                  ? colors.statusCompleted
                  : visit.status === 'pending'
                  ? colors.statusPending
                  : colors.statusCanceled

              return (
                <Pressable
                  key={visit.id}
                  style={({ pressed }) => [styles.visitRow, pressed && styles.rowPressed]}
                  onPress={() => router.push(`/visits/${visit.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver visita a ${clientName}`}
                >
                  <View style={[styles.statusStrip, { backgroundColor: stripColor }]} />
                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {clientName}
                    </Text>
                    <Text style={styles.rowSubtitle}>{dateText}</Text>
                  </View>
                  <StatusBadge status={visit.status} type={visit.type} />
                </Pressable>
              )
            })}
          </View>
        )}
      </View>

      {/* Clients section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Clientes</Text>
          {teamClientsLoading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        {teamClients.length === 0 && !teamClientsLoading ? (
          <View style={styles.emptySmall}>
            <Text style={styles.emptySmallText}>Sin clientes registrados</Text>
          </View>
        ) : (
          <View style={styles.itemList}>
            {teamClients.map((client) => {
              const subtitle = [client.industry, client.city].filter(Boolean).join(' · ')
              return (
                <Pressable
                  key={client.id}
                  style={({ pressed }) => [styles.clientRow, pressed && styles.rowPressed]}
                  onPress={() => router.push(`/clients/${client.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver cliente ${client.name}`}
                >
                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {client.name}
                    </Text>
                    {subtitle ? (
                      <Text style={styles.rowSubtitle} numberOfLines={1}>
                        {subtitle}
                      </Text>
                    ) : null}
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              )
            })}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing[8],
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

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    alignItems: 'center',
    ...shadows.subtle,
  },
  statNumber: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold as '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing[1],
  },

  // Sections
  section: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
    flex: 1,
  },
  itemList: {
    gap: spacing[2],
    marginBottom: spacing[4],
  },

  // Visit row
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    ...shadows.subtle,
    overflow: 'hidden',
  },
  statusStrip: {
    width: 4,
    alignSelf: 'stretch',
  },

  // Client row
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    ...shadows.subtle,
  },

  rowPressed: {
    backgroundColor: colors.background,
  },
  rowContent: {
    flex: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  rowTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing[1],
  },

  // Empty
  emptySmall: {
    paddingVertical: spacing[6],
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  emptySmallText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
})
