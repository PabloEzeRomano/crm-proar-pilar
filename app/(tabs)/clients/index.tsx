/**
 * app/(tabs)/clients/index.tsx — Clients list with search
 *
 * Story 4.3 — EP-004
 *
 * Features:
 *   - Fetches clients on mount via useClients hook
 *   - Search bar filtering by name / city / industry
 *   - FlatList of client rows (ListItem-spec compliant: min 64px height)
 *   - Empty state and loading state
 *   - FAB to navigate to create form
 */

import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { useClients } from '@/hooks/useClients'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'
import { Client } from '@/types'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientsIndexScreen() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const { clients, loading, fetchClients } = useClients(searchQuery)

  useEffect(() => {
    fetchClients()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleRowPress(client: Client) {
    router.push(`/clients/${client.id}`)
  }

  function handleFabPress() {
    router.push('/clients/form')
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function renderItem({ item }: { item: Client }) {
    const subtitle = [item.industry, item.city].filter(Boolean).join(' · ')

    return (
      <Pressable
        style={({ pressed }) => [
          styles.row,
          pressed && styles.rowPressed,
        ]}
        onPress={() => handleRowPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`Ver cliente ${item.name}`}
      >
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.name}
          </Text>
          {subtitle ? (
            <Text style={styles.rowSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>
    )
  }

  function renderSeparator() {
    return <View style={styles.divider} />
  }

  function renderEmpty() {
    if (loading) return null
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay clientes</Text>
      </View>
    )
  }

  // -------------------------------------------------------------------------
  // Root render
  // -------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={18}
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar cliente..."
            placeholderTextColor={colors.textDisabled}
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Loading state */}
      {loading && clients.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={renderSeparator}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            clients.length === 0 ? styles.listEmptyContent : undefined
          }
        />
      )}

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={handleFabPress}
        accessibilityRole="button"
        accessibilityLabel="Agregar cliente"
      >
        <Ionicons name="add" size={28} color={colors.textOnPrimary} />
      </Pressable>
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

  // Search bar
  searchWrapper: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
  },
  searchIcon: {
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    height: 48,
  },

  // List rows — minimum height 64px per ListItem spec
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
  },
  rowPressed: {
    backgroundColor: colors.background,
  },
  rowContent: {
    flex: 1,
    marginRight: spacing[2],
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing[4],
  },

  // States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  listEmptyContent: {
    flex: 1,
  },

  // FAB — 56px as per primary-action spec
  fab: {
    position: 'absolute',
    bottom: spacing[6],
    right: spacing[6],
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabPressed: {
    backgroundColor: colors.primaryDark,
  },
})
