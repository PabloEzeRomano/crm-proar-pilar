/**
 * app/(tabs)/team.tsx — Team dashboard (admin only)
 *
 * Features:
 *   - Shows all team members' visits across all time (subject to RLS)
 *   - Shows all team members' clients
 *   - Organized by sections: Recent Visits, Team Clients
 *   - Each item shows the team member's name (owner) and relevant data
 *   - Status filters for visits (Todas, Pendientes, Completadas, Canceladas)
 *   - Only visible to admins on web platform
 */

import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
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
import { VisitStatus, VisitWithClient, Client } from '@/types'
import { useVisits } from '@/hooks/useVisits'
import { useClients } from '@/hooks/useClients'
import { useAuthStore } from '@/stores/authStore'
import { StatusBadge } from '@/components/ui/StatusBadge'

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

const STATUS_STRIP_COLOR: Record<VisitStatus, string> = {
  pending: colors.statusPending,
  completed: colors.statusCompleted,
  canceled: colors.statusCanceled,
}

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

type FilterOption = { key: VisitStatus | 'all' | 'upcoming'; label: string }

const FILTER_OPTIONS: FilterOption[] = [
  { key: 'all', label: 'Todas' },
  { key: 'upcoming', label: 'Próximas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'completed', label: 'Completadas' },
  { key: 'canceled', label: 'Canceladas' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TeamScreen() {
  const router = useRouter()
  const profile = useAuthStore((state) => state.profile)
  const isAdmin = profile?.role === 'admin'

  const [activeFilter, setActiveFilter] = useState<VisitStatus | 'all' | 'upcoming'>('all')

  // Fetch all team visits (showAll=true for admin)
  const { visits, loading: visitsLoading, error: visitsError, fetchVisits } = useVisits(
    undefined,
    activeFilter,
    true // showAll - fetch all team visits via RLS
  )

  // Fetch all team clients
  const { clients, loading: clientsLoading, ownerProfiles } = useClients()

  useEffect(() => {
    fetchVisits()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function getOwnerName(userId: string): string {
    const profile = ownerProfiles[userId]
    return profile?.full_name || 'Unknown'
  }

  function handleVisitPress(visit: VisitWithClient) {
    router.push(`/visits/${visit.id}?from=team`)
  }

  function handleClientPress(client: Client) {
    router.push(`/clients/${client.id}?from=team`)
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function renderFilterPill({ key, label }: FilterOption) {
    const isActive = key === activeFilter
    return (
      <Pressable
        key={key}
        style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive]}
        onPress={() => setActiveFilter(key)}
        accessibilityRole="button"
        accessibilityLabel={`Filtrar por ${label}`}
        accessibilityState={{ selected: isActive }}
      >
        <Text style={[styles.pillText, isActive ? styles.pillTextActive : styles.pillTextInactive]}>
          {label}
        </Text>
      </Pressable>
    )
  }

  function renderVisitRow(visit: VisitWithClient) {
    const clientName = visit.client?.name ?? 'Cliente desconocido'
    const ownerName = getOwnerName(visit.owner_user_id)
    const dateText = dayjs(visit.scheduled_at).format('ddd D MMM · HH:mm')

    return (
      <Pressable
        key={visit.id}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => handleVisitPress(visit)}
        accessibilityRole="button"
        accessibilityLabel={`Ver visita a ${clientName} por ${ownerName}`}
      >
        {/* Status strip */}
        <View
          style={[
            styles.statusStrip,
            { backgroundColor: STATUS_STRIP_COLOR[visit.status] },
          ]}
        />

        {/* Row content */}
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {clientName}
          </Text>
          <View style={styles.subtitleRow}>
            <Text style={styles.rowSubtitle} numberOfLines={1}>
              {dateText}
            </Text>
          </View>
          <Text style={styles.ownerIndicator} numberOfLines={1}>
            por: {ownerName}
          </Text>
        </View>

        {/* Status badge */}
        <StatusBadge status={visit.status} />
      </Pressable>
    )
  }

  function renderClientRow(client: Client) {
    const ownerName = getOwnerName(client.owner_user_id)
    const subtitle = [client.industry, client.city].filter(Boolean).join(' · ')

    return (
      <Pressable
        key={client.id}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => handleClientPress(client)}
        accessibilityRole="button"
        accessibilityLabel={`Ver cliente ${client.name} de ${ownerName}`}
      >
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {client.name}
          </Text>
          {subtitle && (
            <Text style={styles.rowSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
          <Text style={styles.ownerIndicator} numberOfLines={1}>
            por: {ownerName}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
      </Pressable>
    )
  }

  // -------------------------------------------------------------------------
  // Render: Empty state
  // -------------------------------------------------------------------------

  function renderEmptyState(type: 'visits' | 'clients') {
    const loading = type === 'visits' ? visitsLoading : clientsLoading
    const error = type === 'visits' ? visitsError : null

    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTextError}>{error}</Text>
        </View>
      )
    }

    const emptyText =
      type === 'visits' ? 'No hay visitas de equipo' : 'No hay clientes de equipo'

    return (
      <View style={styles.emptySmallContainer}>
        <Text style={styles.emptyTextSmall}>{emptyText}</Text>
      </View>
    )
  }

  // -------------------------------------------------------------------------
  // Root render
  // -------------------------------------------------------------------------

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No tienes acceso a esta sección</Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Filter pills */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((option) => renderFilterPill(option))}
      </View>

      {/* Section: Team Visits */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Visitas del Equipo</Text>
          {visits.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {visits.length} {visits.length === 1 ? 'visita' : 'visitas'}
              </Text>
            </View>
          )}
        </View>

        {visits.length === 0 ? (
          renderEmptyState('visits')
        ) : (
          <View style={styles.rowList}>
            {visits.map((visit) => renderVisitRow(visit))}
          </View>
        )}
      </View>

      {/* Section: Team Clients */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Clientes del Equipo</Text>
          {clients.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
              </Text>
            </View>
          )}
        </View>

        {clientsLoading && clients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : clients.length === 0 ? (
          renderEmptyState('clients')
        ) : (
          <View style={styles.rowList}>
            {clients.map((client) => renderClientRow(client))}
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
  // ── Layout ────────────────────────────────────────────────────────────────
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing[8],
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Filter pills ──────────────────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  pill: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillInactive: {
    backgroundColor: colors.surface,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
  },
  pillTextActive: {
    color: colors.textOnPrimary,
  },
  pillTextInactive: {
    color: colors.textSecondary,
  },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
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
  },
  countBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  countBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
    color: colors.primary,
  },

  // ── Row list ──────────────────────────────────────────────────────────────
  rowList: {
    gap: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    ...shadows.subtle,
    gap: spacing[3],
  },
  rowPressed: {
    backgroundColor: colors.background,
  },
  statusStrip: {
    width: 4,
    height: '100%',
    borderRadius: borderRadius.sm,
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular as '400',
    color: colors.textSecondary,
    marginTop: spacing[1],
  },
  subtitleRow: {
    marginTop: spacing[1],
  },
  ownerIndicator: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular as '400',
    color: colors.textDisabled,
    marginTop: spacing[1],
  },

  // ── Empty states ──────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  emptySmallContainer: {
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyTextSmall: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyTextError: {
    fontSize: fontSize.base,
    color: colors.error,
    textAlign: 'center',
  },
})
