/**
 * app/(tabs)/team/[userId].tsx — Per-user activity drill-down (admin/root only)
 *
 * EP-052 — 52.4
 *
 * Tabbed view:
 *   Visitas — search by client name + type filter pills + VisitRow (read-only)
 *   Clientes — search by name/city/industry + read-only list → clients/[id]
 *
 * Data is fetched into teamVisits / teamClients (separate state keys)
 * to avoid polluting the logged-in user's own data.
 * State is cleared on blur to prevent stale data on re-navigation.
 */

import React, { useCallback, useLayoutEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { VisitRow } from '@/components/visits/VisitRow'
import type { Client, VisitType, VisitWithClient } from '@/types'

// ---------------------------------------------------------------------------
// Type filter
// ---------------------------------------------------------------------------

type FilterType = 'all' | VisitType

const TYPE_FILTERS: Array<{ key: FilterType; label: string }> = [
  { key: 'all', label: 'Todas' },
  { key: 'visit', label: 'Visita' },
  { key: 'call', label: 'Llamada' },
  { key: 'quote', label: 'Cotización' },
  { key: 'sale', label: 'Venta' },
]

// ---------------------------------------------------------------------------
// Client row sub-component
// ---------------------------------------------------------------------------

interface ClientRowProps {
  client: Client
  onPress: () => void
}

function ClientRow({ client, onPress }: ClientRowProps) {
  const lastVisitedLabel = client.last_visited_at
    ? `Visitado hace ${dayjs().diff(dayjs(client.last_visited_at), 'day')}d`
    : null

  return (
    <Pressable
      style={({ pressed }) => [styles.clientRow, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver cliente ${client.name}`}
    >
      <View style={styles.clientRowContent}>
        <Text style={styles.clientName} numberOfLines={1}>
          {client.name}
        </Text>
        <View style={styles.clientMeta}>
          {client.industry ? (
            <View style={styles.industryBadge}>
              <Text style={styles.industryBadgeText} numberOfLines={1}>
                {client.industry}
              </Text>
            </View>
          ) : null}
          {lastVisitedLabel ? (
            <Text style={styles.lastVisitedText}>{lastVisitedLabel}</Text>
          ) : null}
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
    </Pressable>
  )
}

// ---------------------------------------------------------------------------
// Main component
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

  const [activeTab, setActiveTab] = useState<'visits' | 'clients'>('visits')
  const [visitSearch, setVisitSearch] = useState('')
  const [visitTypeFilter, setVisitTypeFilter] = useState<FilterType>('all')
  const [clientSearch, setClientSearch] = useState('')

  // ── Header title ───────────────────────────────────────────────────────────

  useLayoutEffect(() => {
    if (teamUser?.full_name) {
      navigation.setOptions({ title: teamUser.full_name })
    }
  }, [navigation, teamUser?.full_name])

  // ── Fetch on focus, clear on blur ──────────────────────────────────────────

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

  // ── Guard ──────────────────────────────────────────────────────────────────

  if (!isAdminOrRoot) {
    return (
      <View style={styles.guardContainer}>
        <MaterialCommunityIcons name="lock-outline" size={48} color={colors.textDisabled} />
        <Text style={styles.guardText}>No tenés acceso a esta sección</Text>
      </View>
    )
  }

  // ── Filtered data ──────────────────────────────────────────────────────────

  const filteredVisits: VisitWithClient[] = teamVisits.filter((v) => {
    const matchesType = visitTypeFilter === 'all' || v.type === visitTypeFilter
    const matchesSearch =
      !visitSearch.trim() ||
      (v.client?.name ?? '').toLowerCase().includes(visitSearch.toLowerCase())
    return matchesType && matchesSearch
  })

  const filteredClients: Client[] = teamClients.filter((c) => {
    const q = clientSearch.toLowerCase().trim()
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      (c.city ?? '').toLowerCase().includes(q) ||
      (c.industry ?? '').toLowerCase().includes(q)
    )
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* ── Segmented control ──────────────────────────────────────────────── */}
      <View style={styles.segmentedWrapper}>
        <View style={styles.segmentedControl}>
          <Pressable
            style={[styles.segmentButton, activeTab === 'visits' && styles.segmentButtonActive]}
            onPress={() => setActiveTab('visits')}
            accessibilityRole="button"
            accessibilityLabel="Ver visitas"
          >
            <Text
              style={[
                styles.segmentButtonText,
                activeTab === 'visits' && styles.segmentButtonTextActive,
              ]}
            >
              Visitas{teamVisits.length > 0 ? ` (${teamVisits.length})` : ''}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentButton, activeTab === 'clients' && styles.segmentButtonActive]}
            onPress={() => setActiveTab('clients')}
            accessibilityRole="button"
            accessibilityLabel="Ver clientes"
          >
            <Text
              style={[
                styles.segmentButtonText,
                activeTab === 'clients' && styles.segmentButtonTextActive,
              ]}
            >
              Clientes{teamClients.length > 0 ? ` (${teamClients.length})` : ''}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Visitas tab ────────────────────────────────────────────────────── */}
      {activeTab === 'visits' && (
        <View style={styles.tabContent}>
          {/* Search */}
          <View style={styles.searchWrapper}>
            <MaterialCommunityIcons
              name="magnify"
              size={18}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              value={visitSearch}
              onChangeText={setVisitSearch}
              placeholder="Buscar por cliente…"
              placeholderTextColor={colors.textDisabled}
              clearButtonMode="while-editing"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          {/* Type filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsRow}
            style={styles.pillsScroll}
          >
            {TYPE_FILTERS.map((f) => (
              <Pressable
                key={f.key}
                style={[styles.pill, visitTypeFilter === f.key && styles.pillActive]}
                onPress={() => setVisitTypeFilter(f.key)}
                accessibilityRole="button"
                accessibilityLabel={f.label}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Text
                  style={[
                    styles.pillText,
                    visitTypeFilter === f.key && styles.pillTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Visit list */}
          {teamLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredVisits}
              keyExtractor={(v) => v.id}
              renderItem={({ item }) => (
                <VisitRow
                  visit={item}
                  onPress={() => router.push(`/visits/${item.id}` as never)}
                  showOwner={false}
                  showAmount
                />
              )}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {visitSearch || visitTypeFilter !== 'all'
                      ? 'Sin resultados para este filtro'
                      : 'Sin visitas registradas'}
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {/* ── Clientes tab ───────────────────────────────────────────────────── */}
      {activeTab === 'clients' && (
        <View style={styles.tabContent}>
          {/* Search */}
          <View style={styles.searchWrapper}>
            <MaterialCommunityIcons
              name="magnify"
              size={18}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              value={clientSearch}
              onChangeText={setClientSearch}
              placeholder="Buscar por nombre, ciudad o rubro…"
              placeholderTextColor={colors.textDisabled}
              clearButtonMode="while-editing"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          {/* Client list */}
          {teamClientsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredClients}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
                <ClientRow
                  client={item}
                  onPress={() => router.push(`/clients/${item.id}` as never)}
                />
              )}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {clientSearch
                      ? 'Sin resultados para esta búsqueda'
                      : 'Sin clientes registrados'}
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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

  // ── Segmented control ─────────────────────────────────────────────────────
  segmentedWrapper: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    backgroundColor: colors.background,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 2,
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

  // ── Tab content ───────────────────────────────────────────────────────────
  tabContent: {
    flex: 1,
  },

  // ── Search bar ────────────────────────────────────────────────────────────
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    minHeight: 44,
  },
  searchIcon: {
    marginRight: spacing[2],
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    height: 44,
  },

  // ── Type filter pills ─────────────────────────────────────────────────────
  pillsScroll: {
    flexGrow: 0,
    marginBottom: spacing[2],
  },
  pillsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  pill: {
    height: 32,
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight ?? '#EFF6FF',
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold as '600',
  },

  // ── Visit / client list ───────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  separator: {
    height: spacing[2],
  },

  // ── Client row ────────────────────────────────────────────────────────────
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[2],
    ...shadows.subtle,
  },
  rowPressed: {
    backgroundColor: colors.background,
  },
  clientRowContent: {
    flex: 1,
    gap: spacing[1],
  },
  clientName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  clientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  industryBadge: {
    backgroundColor: colors.primaryLight ?? '#EFF6FF',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  industryBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
    color: colors.primary,
  },
  lastVisitedText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },

  // ── Loading / empty ───────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: spacing[12],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
})
