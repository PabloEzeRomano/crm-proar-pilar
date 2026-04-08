/**
 * app/(tabs)/clients/index.tsx — Clients list with search + multiselect filter
 *
 * EP-019: Added rn-tourguide chapter "clients" (3 steps)
 */

import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import TourStep from '@/components/tour/TourStep'

import { useClients, ClientSortOrder } from '@/hooks/useClients'
import { useClientsStore } from '@/stores/clientsStore'
import { useLookupsStore } from '@/stores/lookupsStore'
import SearchableSelect from '@/components/ui/SearchableSelect'
import dayjs from '@/lib/dayjs'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'
import { Client, VisitType } from '@/types'

// ---------------------------------------------------------------------------
// Sort configuration
// ---------------------------------------------------------------------------

const SORT_KEY = 'clients-sort-order'

const SORT_OPTIONS: { key: ClientSortOrder; label: string; icon: string }[] = [
  { key: 'name-asc', label: 'Nombre A–Z', icon: 'sort-alphabetical-ascending' },
  { key: 'name-desc', label: 'Nombre Z–A', icon: 'sort-alphabetical-descending' },
  { key: 'last-visited-recent', label: 'Última visita (reciente)', icon: 'clock-outline' },
  { key: 'last-visited-oldest', label: 'Última visita (antiguo)', icon: 'clock-fast' },
  { key: 'stale-first', label: 'Sin visita (primero)', icon: 'alert-circle-outline' },
]

const VISIT_TYPE_OPTIONS: { value: VisitType; label: string }[] = [
  { value: 'visit', label: 'Visita' },
  { value: 'call', label: 'Llamada' },
  { value: 'sale', label: 'Venta' },
  { value: 'quote', label: 'Cotización' },
]

// ---------------------------------------------------------------------------
// Inner screen component (needs to be inside TourGuideProvider)
// ---------------------------------------------------------------------------

function ClientsScreenContent() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRubros, setSelectedRubros] = useState<string[]>([])
  const [selectedLocalidades, setSelectedLocalidades] = useState<string[]>([])
  const [selectedStaleDays, setSelectedStaleDays] = useState<number | null>(null)
  const [selectedVisitType, setSelectedVisitType] = useState<VisitType | null>(null)
  const [sortOrder, setSortOrder] = useState<ClientSortOrder>('name-asc')
  const [filterVisible, setFilterVisible] = useState(false)
  const [sortVisible, setSortVisible] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  // Draft state inside the filter modal (applied only on "Aplicar")
  const [draftRubros, setDraftRubros] = useState<string[]>([])
  const [draftLocalidades, setDraftLocalidades] = useState<string[]>([])
  const [draftStaleDays, setDraftStaleDays] = useState<number | null>(null)
  const [draftVisitType, setDraftVisitType] = useState<VisitType | null>(null)

  const { clients, loading, error, fetchClients, ownerProfiles, isAdminMode } = useClients(
    searchQuery,
    selectedRubros,
    selectedLocalidades,
    selectedStaleDays,
    sortOrder,
    selectedVisitType,
  )
  const inactiveClients = useClientsStore((s) => s.inactiveClients)
  const fetchInactiveClients = useClientsStore((s) => s.fetchInactiveClients)
  const restoreClient = useClientsStore((s) => s.restoreClient)
  const rubros = useLookupsStore((s) => s.rubros)
  const localidades = useLookupsStore((s) => s.localidades)

  const activeFilterCount =
    selectedRubros.length +
    selectedLocalidades.length +
    (selectedStaleDays ? 1 : 0) +
    (selectedVisitType ? 1 : 0)

  // Load persisted sort order on mount
  useEffect(() => {
    AsyncStorage.getItem(SORT_KEY).then((val) => {
      if (val) setSortOrder(val as ClientSortOrder)
    })
  }, [])

  useEffect(() => {
    fetchClients()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showInactive) {
      fetchInactiveClients()
    }
  }, [showInactive]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter modal handlers ────────────────────────────────────────────────

  function openFilter() {
    // Copy current selection into draft
    setDraftRubros([...selectedRubros])
    setDraftLocalidades([...selectedLocalidades])
    setDraftStaleDays(selectedStaleDays)
    setDraftVisitType(selectedVisitType)
    setFilterVisible(true)
  }

  function applyFilter() {
    setSelectedRubros(draftRubros)
    setSelectedLocalidades(draftLocalidades)
    setSelectedStaleDays(draftStaleDays)
    setSelectedVisitType(draftVisitType)
    setFilterVisible(false)
  }

  function clearFilter() {
    setDraftRubros([])
    setDraftLocalidades([])
    setDraftStaleDays(null)
    setDraftVisitType(null)
  }

  function handleSortSelect(order: ClientSortOrder) {
    setSortOrder(order)
    AsyncStorage.setItem(SORT_KEY, order)
    setSortVisible(false)
  }

  function toggleDraft(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  // ── List helpers ─────────────────────────────────────────────────────────

  function daysSince(iso: string | null | undefined): number | null {
    if (!iso) return null
    return dayjs().diff(dayjs(iso), 'day')
  }

  function getLastVisitedColor(days: number | null): string {
    if (days === null) return colors.textDisabled
    if (days < 30) return colors.statusCompleted
    if (days <= 60) return colors.statusPending
    return colors.error
  }

  function getLastVisitedLabel(days: number | null): string {
    if (days === null) return 'Sin visitas'
    return `Hace ${days}d`
  }

  function handleRowPress(client: Client) {
    router.push(`/clients/${client.id}`)
  }

  function renderItem({ item }: { item: Client }) {
    const subtitle = [item.industry, item.city].filter(Boolean).join(' · ')
    const days = daysSince(item.last_visited_at)
    const badgeColor = getLastVisitedColor(days)
    const badgeLabel = getLastVisitedLabel(days)

    // Get owner name for admin mode
    const ownerName = isAdminMode ? ownerProfiles[item.owner_user_id]?.full_name : null

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
          {ownerName && (
            <Text style={styles.ownerLabel} numberOfLines={1}>
              por: {ownerName}
            </Text>
          )}
          <View style={styles.badgeRow}>
            <MaterialCommunityIcons
              name="calendar-clock"
              size={12}
              color={badgeColor}
            />
            <Text style={[styles.badgeText, { color: badgeColor }]}>
              {badgeLabel}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>
    )
  }

  function renderInactiveItem({ item }: { item: Client }) {
    const subtitle = [item.industry, item.city].filter(Boolean).join(' · ')
    return (
      <View style={styles.inactiveRow}>
        <View style={styles.rowContent}>
          <View style={styles.inactiveRowHeader}>
            <Text style={styles.inactiveRowTitle} numberOfLines={1}>{item.name}</Text>
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inactivo</Text>
            </View>
          </View>
          {subtitle ? (
            <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.restoreButton,
            pressed && styles.restoreButtonPressed,
          ]}
          onPress={() => restoreClient(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Restaurar ${item.name}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.restoreButtonText}>Restaurar</Text>
        </Pressable>
      </View>
    )
  }

  function renderEmpty() {
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
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay clientes</Text>
      </View>
    )
  }

  // ── Root render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* ── Tour steps 4 (search bar) + 5 (filter button) ── */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBarZone}>
          <TourStep
            order={4}
            text="Buscá cualquier cliente por nombre, rubro, ciudad o teléfono de contacto. La búsqueda es instantánea."
            borderRadius={borderRadius.lg}
            routePath="/(tabs)/clients"
            wrapperStyle={{ flex: 1 }}
          >
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
          </TourStep>
        </View>

        {/* Sort button */}
        <Pressable
          style={styles.filterButton}
          onPress={() => setSortVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Ordenar clientes"
        >
          <MaterialCommunityIcons name="sort" size={20} color={colors.textSecondary} />
        </Pressable>

        <TourStep
          order={5}
          text="Filtrá tu cartera por rubro, localidad o clientes sin visita reciente (30, 60 o 90 días). Podés combinar varios filtros."
          routePath="/(tabs)/clients"
        >
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
        </TourStep>

        {/* Inactivos toggle */}
        <Pressable
          style={[styles.filterButton, showInactive && styles.filterButtonActive]}
          onPress={() => setShowInactive(!showInactive)}
          accessibilityRole="switch"
          accessibilityState={{ checked: showInactive }}
          accessibilityLabel="Mostrar clientes inactivos"
        >
          <MaterialCommunityIcons
            name="archive-outline"
            size={20}
            color={showInactive ? colors.textOnPrimary : colors.textSecondary}
          />
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
                hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
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
                hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
              >
                <Text style={styles.activeChipText} numberOfLines={1}>{l}</Text>
                <MaterialCommunityIcons name="close" size={14} color={colors.primary} />
              </Pressable>
            ))}
            {selectedStaleDays && (
              <Pressable
                style={styles.activeChip}
                onPress={() => setSelectedStaleDays(null)}
                accessibilityLabel={`Quitar filtro sin visita ${selectedStaleDays} días`}
                hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
              >
                <Text style={styles.activeChipText} numberOfLines={1}>
                  Sin visita {selectedStaleDays}d
                </Text>
                <MaterialCommunityIcons name="close" size={14} color={colors.primary} />
              </Pressable>
            )}
            {selectedVisitType && (
              <Pressable
                style={styles.activeChip}
                onPress={() => setSelectedVisitType(null)}
                accessibilityLabel={`Quitar filtro tipo ${selectedVisitType}`}
                hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
              >
                <Text style={styles.activeChipText} numberOfLines={1}>
                  {VISIT_TYPE_OPTIONS.find((o) => o.value === selectedVisitType)?.label}
                </Text>
                <MaterialCommunityIcons name="close" size={14} color={colors.primary} />
              </Pressable>
            )}
            <Pressable
              onPress={() => {
                setSelectedRubros([])
                setSelectedLocalidades([])
                setSelectedStaleDays(null)
                setSelectedVisitType(null)
              }}
              accessibilityLabel="Limpiar todos los filtros"
            >
              <Text style={styles.clearAllText}>Limpiar todo</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* List */}
      {loading && (showInactive ? inactiveClients.length === 0 : clients.length === 0) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : showInactive ? (
        <FlatList
          data={inactiveClients}
          keyExtractor={(item) => item.id}
          renderItem={renderInactiveItem}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay clientes inactivos</Text>
            </View>
          )}
          contentContainerStyle={inactiveClients.length === 0 ? styles.listEmptyContent : undefined}
        />
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

      {/* ── Tour step 6: FAB ── */}
      {/* Outer View holds position:absolute so TourStep's wrapper has real
          56×56 dimensions. Without this the child Pressable's absolute
          positioning gives TourStep a 0×0 size and measureInWindow returns
          nothing (no spotlight rendered). */}
      <View style={styles.fabContainer}>
        <TourStep
          order={6}
          text="Tocá el botón + para agregar un nuevo cliente. También podés importar todos tus clientes desde un archivo Excel en Configuración."
          routePath="/(tabs)/clients"
          borderRadius={borderRadius.full}
        >
          <Pressable
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            onPress={() => router.push('/clients/form')}
            accessibilityRole="button"
            accessibilityLabel="Agregar cliente"
          >
            <Ionicons name="add" size={28} color={colors.textOnPrimary} />
          </Pressable>
        </TourStep>
      </View>

      {/* Sort modal */}
      <Modal
        visible={sortVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSortVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSortVisible(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ordenar por</Text>
            <Pressable
              onPress={() => setSortVisible(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Cerrar orden"
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          {SORT_OPTIONS.map(({ key, label, icon }) => {
            const selected = sortOrder === key
            return (
              <Pressable
                key={key}
                style={({ pressed }) => [styles.checkRow, pressed && styles.checkRowPressed]}
                onPress={() => handleSortSelect(key)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={label}
              >
                <MaterialCommunityIcons
                  name={icon as 'sort'}
                  size={20}
                  color={selected ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.checkLabel, selected && styles.checkLabelSelected]}>
                  {label}
                </Text>
                {selected && (
                  <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                )}
              </Pressable>
            )
          })}
        </View>
      </Modal>

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
                <View style={styles.filterSectionPadded}>
                  <SearchableSelect
                    label="Rubro"
                    options={rubros}
                    selected={draftRubros}
                    onChange={setDraftRubros}
                    multiple
                    placeholder="Todos los rubros"
                  />
                </View>
              </View>
            )}

            {/* Localidad section */}
            {localidades.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>LOCALIDAD</Text>
                <View style={styles.filterSectionPadded}>
                  <SearchableSelect
                    label="Localidad"
                    options={localidades}
                    selected={draftLocalidades}
                    onChange={setDraftLocalidades}
                    multiple
                    placeholder="Todas las localidades"
                  />
                </View>
              </View>
            )}

            {/* Sin visita section — radio-style selection */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>SIN VISITA</Text>
              {[
                { label: '30 días', value: 30 },
                { label: '60 días', value: 60 },
                { label: '90 días', value: 90 },
              ].map(({ label, value }) => {
                const checked = draftStaleDays === value
                return (
                  <Pressable
                    key={value}
                    style={({ pressed }) => [styles.checkRow, pressed && styles.checkRowPressed]}
                    onPress={() => setDraftStaleDays(checked ? null : value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: checked }}
                    accessibilityLabel={label}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <MaterialCommunityIcons name="check" size={14} color={colors.textOnPrimary} />}
                    </View>
                    <Text style={styles.checkLabel} numberOfLines={1}>{label}</Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Tipo de gestión section */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>TIPO DE GESTIÓN</Text>
              {VISIT_TYPE_OPTIONS.map(({ value, label }) => {
                const checked = draftVisitType === value
                return (
                  <Pressable
                    key={value}
                    style={({ pressed }) => [styles.checkRow, pressed && styles.checkRowPressed]}
                    onPress={() => setDraftVisitType(checked ? null : value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: checked }}
                    accessibilityLabel={label}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <MaterialCommunityIcons name="check" size={14} color={colors.textOnPrimary} />}
                    </View>
                    <Text style={styles.checkLabel} numberOfLines={1}>{label}</Text>
                  </Pressable>
                )
              })}
            </View>

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
                {(() => {
                  const count = draftRubros.length + draftLocalidades.length + (draftStaleDays ? 1 : 0) + (draftVisitType ? 1 : 0)
                  return count > 0 ? `Aplicar (${count})` : 'Aplicar'
                })()}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}

export default ClientsScreenContent

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
  searchBarZone: {
    flex: 1,
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
    paddingVertical: spacing[1],
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
  ownerLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular as '400',
    color: colors.textDisabled,
    marginTop: spacing[1],
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium as '500',
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
  emptyTextError: {
    fontSize: fontSize.base,
    color: colors.error,
  },
  listEmptyContent: {
    flex: 1,
  },

  // ── FAB ────────────────────────────────────────────────────────────────────

  fabContainer: {
    position: 'absolute',
    bottom: spacing[6],
    right: spacing[6],
  },
  fab: {
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
  filterSectionPadded: {
    paddingHorizontal: spacing[4],
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
  checkLabelSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold as '600',
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

  // ── Inactive clients ───────────────────────────────────────────────────────

  inactiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    opacity: 0.75,
  },
  inactiveRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  inactiveRowTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textSecondary,
  },
  inactiveBadge: {
    backgroundColor: colors.statusCanceledLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  inactiveBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
    color: colors.statusCanceled,
  },
  restoreButton: {
    height: 36,
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: spacing[2],
  },
  restoreButtonPressed: {
    opacity: 0.7,
  },
  restoreButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as '600',
    color: colors.primary,
  },
})
