/**
 * app/(tabs)/clients/index.tsx — Clients list with search + multiselect filter
 */

import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'

import { useClients } from '@/hooks/useClients'
import { useLookupsStore } from '@/stores/lookupsStore'
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
  const [selectedRubros, setSelectedRubros] = useState<string[]>([])
  const [selectedLocalidades, setSelectedLocalidades] = useState<string[]>([])
  const [filterVisible, setFilterVisible] = useState(false)

  // Draft state inside the modal (applied only on "Aplicar")
  const [draftRubros, setDraftRubros] = useState<string[]>([])
  const [draftLocalidades, setDraftLocalidades] = useState<string[]>([])

  const { clients, loading, fetchClients } = useClients(searchQuery, selectedRubros, selectedLocalidades)
  const rubros = useLookupsStore((s) => s.rubros)
  const localidades = useLookupsStore((s) => s.localidades)

  const activeFilterCount = selectedRubros.length + selectedLocalidades.length

  useEffect(() => {
    fetchClients()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter modal handlers ────────────────────────────────────────────────

  function openFilter() {
    // Copy current selection into draft
    setDraftRubros([...selectedRubros])
    setDraftLocalidades([...selectedLocalidades])
    setFilterVisible(true)
  }

  function applyFilter() {
    setSelectedRubros(draftRubros)
    setSelectedLocalidades(draftLocalidades)
    setFilterVisible(false)
  }

  function clearFilter() {
    setDraftRubros([])
    setDraftLocalidades([])
  }

  function toggleDraft(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  // ── List helpers ─────────────────────────────────────────────────────────

  function handleRowPress(client: Client) {
    router.push(`/clients/${client.id}`)
  }

  function renderItem({ item }: { item: Client }) {
    const subtitle = [item.industry, item.city].filter(Boolean).join(' · ')
    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => handleRowPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`Ver cliente ${item.name}`}
      >
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
          {subtitle ? (
            <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>
    )
  }

  function renderEmpty() {
    if (loading) return null
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay clientes</Text>
      </View>
    )
  }

  // ── Root render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* Search bar + filter button */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
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

        <Pressable
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
          onPress={openFilter}
          accessibilityRole="button"
          accessibilityLabel={`Filtros${activeFilterCount > 0 ? `, ${activeFilterCount} activos` : ''}`}
        >
          <MaterialCommunityIcons
            name="tune-variant"
            size={20}
            color={activeFilterCount > 0 ? colors.textOnPrimary : colors.textSecondary}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Active filter chips summary */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFiltersBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersScroll}>
            {selectedRubros.map((r) => (
              <Pressable
                key={r}
                style={styles.activeChip}
                onPress={() => setSelectedRubros(selectedRubros.filter((v) => v !== r))}
                accessibilityLabel={`Quitar filtro ${r}`}
              >
                <Text style={styles.activeChipText} numberOfLines={1}>{r}</Text>
                <MaterialCommunityIcons name="close" size={14} color={colors.primary} />
              </Pressable>
            ))}
            {selectedLocalidades.map((l) => (
              <Pressable
                key={l}
                style={styles.activeChip}
                onPress={() => setSelectedLocalidades(selectedLocalidades.filter((v) => v !== l))}
                accessibilityLabel={`Quitar filtro ${l}`}
              >
                <Text style={styles.activeChipText} numberOfLines={1}>{l}</Text>
                <MaterialCommunityIcons name="close" size={14} color={colors.primary} />
              </Pressable>
            ))}
            <Pressable
              onPress={() => { setSelectedRubros([]); setSelectedLocalidades([]) }}
              accessibilityLabel="Limpiar todos los filtros"
            >
              <Text style={styles.clearAllText}>Limpiar todo</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* List */}
      {loading && clients.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={clients.length === 0 ? styles.listEmptyContent : undefined}
        />
      )}

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push('/clients/form')}
        accessibilityRole="button"
        accessibilityLabel="Agregar cliente"
      >
        <Ionicons name="add" size={28} color={colors.textOnPrimary} />
      </Pressable>

      {/* Filter modal */}
      <Modal
        visible={filterVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFilterVisible(false)} />

        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtrar clientes</Text>
            <Pressable
              onPress={() => setFilterVisible(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Cerrar filtros"
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>

            {/* Rubro section */}
            {rubros.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>RUBRO</Text>
                {rubros.map((r) => {
                  const checked = draftRubros.includes(r)
                  return (
                    <Pressable
                      key={r}
                      style={({ pressed }) => [styles.checkRow, pressed && styles.checkRowPressed]}
                      onPress={() => toggleDraft(draftRubros, r, setDraftRubros)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      accessibilityLabel={r}
                    >
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked && <MaterialCommunityIcons name="check" size={14} color={colors.textOnPrimary} />}
                      </View>
                      <Text style={styles.checkLabel} numberOfLines={1}>{r}</Text>
                    </Pressable>
                  )
                })}
              </View>
            )}

            {/* Localidad section */}
            {localidades.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>LOCALIDAD</Text>
                {localidades.map((l) => {
                  const checked = draftLocalidades.includes(l)
                  return (
                    <Pressable
                      key={l}
                      style={({ pressed }) => [styles.checkRow, pressed && styles.checkRowPressed]}
                      onPress={() => toggleDraft(draftLocalidades, l, setDraftLocalidades)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      accessibilityLabel={l}
                    >
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked && <MaterialCommunityIcons name="check" size={14} color={colors.textOnPrimary} />}
                      </View>
                      <Text style={styles.checkLabel} numberOfLines={1}>{l}</Text>
                    </Pressable>
                  )
                })}
              </View>
            )}

          </ScrollView>

          {/* Footer actions */}
          <View style={styles.modalFooter}>
            <Pressable
              style={styles.clearButton}
              onPress={clearFilter}
              accessibilityRole="button"
              accessibilityLabel="Limpiar filtros"
            >
              <Text style={styles.clearButtonText}>Limpiar</Text>
            </Pressable>
            <Pressable
              style={styles.applyButton}
              onPress={applyFilter}
              accessibilityRole="button"
              accessibilityLabel="Aplicar filtros"
            >
              <Text style={styles.applyButtonText}>
                Aplicar{draftRubros.length + draftLocalidades.length > 0
                  ? ` (${draftRubros.length + draftLocalidades.length})`
                  : ''}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // ── Search bar ─────────────────────────────────────────────────────────────

  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing[2],
  },
  searchBar: {
    flex: 1,
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
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: borderRadius.full,
    backgroundColor: colors.textOnPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold as '700',
    color: colors.primary,
  },

  // ── Active filter chips ────────────────────────────────────────────────────

  activeFiltersBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activeFiltersScroll: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[2],
    alignItems: 'center',
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    height: 30,
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  activeChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.primary,
    maxWidth: 120,
  },
  clearAllText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
    paddingHorizontal: spacing[2],
    lineHeight: 30,
    textDecorationLine: 'underline',
  },

  // ── List rows ──────────────────────────────────────────────────────────────

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.background,
  },
  rowPressed: {
    backgroundColor: colors.surface,
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

  // ── States ─────────────────────────────────────────────────────────────────

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

  // ── FAB ────────────────────────────────────────────────────────────────────

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

  // ── Filter modal ───────────────────────────────────────────────────────────

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  modalScroll: {
    flexGrow: 0,
  },

  // ── Filter sections ────────────────────────────────────────────────────────

  filterSection: {
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  filterSectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    paddingHorizontal: spacing[4],
    marginBottom: spacing[1],
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 52,
    gap: spacing[3],
  },
  checkRowPressed: {
    backgroundColor: colors.surface,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkLabel: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },

  // ── Modal footer ───────────────────────────────────────────────────────────

  modalFooter: {
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clearButton: {
    flex: 1,
    height: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },
  applyButton: {
    flex: 2,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textOnPrimary,
  },
})
