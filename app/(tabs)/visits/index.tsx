import React, { useEffect, useLayoutEffect, useState } from 'react';
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
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import TourStep from '@/components/tour/TourStep';

import dayjs from '@/lib/dayjs';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme';
import { VisitStatus, VisitType, VisitWithClient } from '@/types';
import { useVisits } from '@/hooks/useVisits';
import { useUsersStore } from '@/stores/usersStore';
import { VisitRow } from '@/components/visits/VisitRow';
import AppDatePicker from '@/components/ui/AppDatePicker';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VISIT_TYPE_OPTIONS: { value: VisitType; label: string }[] = [
  { value: 'visit', label: 'Visita' },
  { value: 'call', label: 'Llamada' },
  { value: 'quote', label: 'Cotización' },
  { value: 'sale', label: 'Venta' },
];

const VISIT_STATUS_OPTIONS: { value: VisitStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'completed', label: 'Completada' },
  { value: 'canceled', label: 'Cancelada' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VisitsIndexScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  // ── Applied filter state ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<VisitType[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<VisitStatus[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  // ── Modal visibility ────────────────────────────────────────────────────
  const [filterVisible, setFilterVisible] = useState(false);

  // ── Draft filter state (applied only on "Aplicar") ──────────────────────
  const [draftTypes, setDraftTypes] = useState<VisitType[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<VisitStatus[]>([]);
  const [draftOwners, setDraftOwners] = useState<string[]>([]);
  const [draftFrom, setDraftFrom] = useState<Date>(new Date());
  const [draftTo, setDraftTo] = useState<Date>(new Date());
  const [draftDateActive, setDraftDateActive] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const {
    visits: hookVisits,
    isAdminOrRoot,
    hasMore,
    loading,
    loadingMore,
    error,
    fetchVisits,
    fetchMoreVisits,
  } = useVisits(
    undefined,
    undefined,
    selectedOwners.length > 0 ? selectedOwners : undefined,
    selectedTypes.length > 0 ? selectedTypes : undefined
  );

  const { users, fetchUsers } = useUsersStore();

  useEffect(() => {
    fetchVisits();
  }, []);

  useEffect(() => {
    if (isAdminOrRoot) fetchUsers();
  }, [isAdminOrRoot]);

  // Clean header — no calendar button
  useLayoutEffect(() => {
    navigation.setOptions({ headerRight: undefined });
  }, [navigation]);

  // ── Client-side filters (search, status, date) ──────────────────────────
  const visits = hookVisits.filter((v) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!v.client?.name?.toLowerCase().includes(q)) return false;
    }
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(v.status))
      return false;
    if (
      dateFrom &&
      dayjs(v.scheduled_at).isBefore(dayjs(dateFrom).startOf('day'))
    )
      return false;
    if (dateTo && dayjs(v.scheduled_at).isAfter(dayjs(dateTo).endOf('day')))
      return false;
    return true;
  });

  // ── Filter count ────────────────────────────────────────────────────────
  const activeFilterCount =
    selectedTypes.length +
    selectedStatuses.length +
    selectedOwners.length +
    (dateFrom || dateTo ? 1 : 0);

  // ── Modal handlers ───────────────────────────────────────────────────────

  function openFilter() {
    setDraftTypes([...selectedTypes]);
    setDraftStatuses([...selectedStatuses]);
    setDraftOwners([...selectedOwners]);
    setDraftFrom(dateFrom ?? new Date());
    setDraftTo(dateTo ?? new Date());
    setDraftDateActive(Boolean(dateFrom || dateTo));
    setShowFromPicker(false);
    setShowToPicker(false);
    setFilterVisible(true);
  }

  function applyFilter() {
    setSelectedTypes(draftTypes);
    setSelectedStatuses(draftStatuses);
    setSelectedOwners(draftOwners);
    setDateFrom(draftDateActive ? draftFrom : null);
    setDateTo(draftDateActive ? draftTo : null);
    setFilterVisible(false);
  }

  function clearFilter() {
    setDraftTypes([]);
    setDraftStatuses([]);
    setDraftOwners([]);
    setDraftDateActive(false);
  }

  function toggleDraftType(value: VisitType) {
    setDraftTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function toggleDraftStatus(value: VisitStatus) {
    setDraftStatuses((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function toggleDraftOwner(id: string) {
    setDraftOwners((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  }

  const draftFilterCount =
    draftTypes.length +
    draftStatuses.length +
    draftOwners.length +
    (draftDateActive ? 1 : 0);

  // ── Render helpers ────────────────────────────────────────────────────────

  function handleRowPress(visit: VisitWithClient) {
    router.push(`/visits/${visit.id}`);
  }

  function handleFabPress() {
    router.push('/visits/form');
  }

  function renderItem({ item }: { item: VisitWithClient }) {
    return (
      <VisitRow
        visit={item}
        onPress={() => handleRowPress(item)}
        showType
        showOwner={isAdminOrRoot}
      />
    );
  }

  function renderSeparator() {
    return <View style={styles.rowGap} />;
  }

  function renderEmpty() {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyError}>{error}</Text>
        </View>
      );
    }
    return null;
  }

  // ── Root render ───────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* ── Search bar + filter button ── */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBarZone}>
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
              placeholder="Buscar por cliente..."
              placeholderTextColor={colors.textDisabled}
              clearButtonMode="while-editing"
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
          </View>
        </View>

        <TourStep
          order={7}
          text="Filtrá por tipo de gestión, estado, fecha o vendedor. Podés combinar varios filtros."
          routePath="/(tabs)/visits"
        >
          <Pressable
            style={[
              styles.filterButton,
              activeFilterCount > 0 && styles.filterButtonActive,
            ]}
            onPress={openFilter}
            accessibilityRole="button"
            accessibilityLabel={`Filtros${activeFilterCount > 0 ? `, ${activeFilterCount} activos` : ''}`}
          >
            <MaterialCommunityIcons
              name="tune-variant"
              size={20}
              color={
                activeFilterCount > 0
                  ? colors.textOnPrimary
                  : colors.textSecondary
              }
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </TourStep>
      </View>

      {/* ── Active filter chips ── */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFiltersBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFiltersScroll}
          >
            {selectedTypes.map((t) => (
              <Pressable
                key={t}
                style={styles.activeChip}
                onPress={() =>
                  setSelectedTypes(selectedTypes.filter((v) => v !== t))
                }
                accessibilityLabel={`Quitar filtro ${t}`}
                hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
              >
                <Text style={styles.activeChipText} numberOfLines={1}>
                  {VISIT_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t}
                </Text>
                <MaterialCommunityIcons
                  name="close"
                  size={14}
                  color={colors.primary}
                />
              </Pressable>
            ))}
            {selectedStatuses.map((s) => (
              <Pressable
                key={s}
                style={styles.activeChip}
                onPress={() =>
                  setSelectedStatuses(selectedStatuses.filter((v) => v !== s))
                }
                accessibilityLabel={`Quitar filtro ${s}`}
                hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
              >
                <Text style={styles.activeChipText} numberOfLines={1}>
                  {VISIT_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s}
                </Text>
                <MaterialCommunityIcons
                  name="close"
                  size={14}
                  color={colors.primary}
                />
              </Pressable>
            ))}
            {selectedOwners.map((id) => {
              const user = users.find((u) => u.id === id);
              return (
                <Pressable
                  key={id}
                  style={styles.activeChip}
                  onPress={() =>
                    setSelectedOwners(selectedOwners.filter((v) => v !== id))
                  }
                  accessibilityLabel={`Quitar filtro vendedor`}
                  hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
                >
                  <Text style={styles.activeChipText} numberOfLines={1}>
                    {user?.full_name ?? id}
                  </Text>
                  <MaterialCommunityIcons
                    name="close"
                    size={14}
                    color={colors.primary}
                  />
                </Pressable>
              );
            })}
            {(dateFrom || dateTo) && (
              <Pressable
                style={styles.activeChip}
                onPress={() => {
                  setDateFrom(null);
                  setDateTo(null);
                }}
                accessibilityLabel="Quitar filtro de fecha"
                hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
              >
                <MaterialCommunityIcons
                  name="calendar-range"
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.activeChipText} numberOfLines={1}>
                  {dateFrom ? dayjs(dateFrom).format('DD/MM') : '…'}
                  {' – '}
                  {dateTo ? dayjs(dateTo).format('DD/MM') : '…'}
                </Text>
                <MaterialCommunityIcons
                  name="close"
                  size={14}
                  color={colors.primary}
                />
              </Pressable>
            )}
            <Pressable
              onPress={() => {
                setSelectedTypes([]);
                setSelectedStatuses([]);
                setSelectedOwners([]);
                setDateFrom(null);
                setDateTo(null);
              }}
              accessibilityLabel="Limpiar todos los filtros"
            >
              <Text style={styles.clearAllText}>Limpiar todo</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* ── List ── */}
      {loading && visits.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={renderSeparator}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            visits.length === 0 ? styles.listEmptyContent : undefined,
          ]}
          onEndReached={() => {
            if (hasMore && !loadingMore) fetchMoreVisits();
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore
              ? () => (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                )
              : null
          }
        />
      )}

      {/* ── FAB — Tour step 8 ── */}
      <View style={styles.fabContainer}>
        <TourStep
          order={8}
          text="Tocá + para agendar una nueva visita. Elegí el cliente, la fecha y hora."
          borderRadius={borderRadius.full}
          routePath="/(tabs)/visits"
        >
          <Pressable
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            onPress={handleFabPress}
            accessibilityRole="button"
            accessibilityLabel="Agregar visita"
          >
            <MaterialCommunityIcons
              name="plus"
              size={28}
              color={colors.textOnPrimary}
            />
          </Pressable>
        </TourStep>
      </View>

      {/* ── Filter modal ── */}
      <Modal
        visible={filterVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterVisible(false)}
        />

        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtrar visitas</Text>
            <Pressable
              onPress={() => setFilterVisible(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Cerrar filtros"
            >
              <MaterialCommunityIcons
                name="close"
                size={22}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* TIPO DE GESTIÓN */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>TIPO DE GESTIÓN</Text>
              {VISIT_TYPE_OPTIONS.map(({ value, label }) => {
                const checked = draftTypes.includes(value);
                return (
                  <Pressable
                    key={value}
                    style={({ pressed }) => [
                      styles.checkRow,
                      pressed && styles.checkRowPressed,
                    ]}
                    onPress={() => toggleDraftType(value)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={label}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        checked && styles.checkboxChecked,
                      ]}
                    >
                      {checked && (
                        <MaterialCommunityIcons
                          name="check"
                          size={14}
                          color={colors.textOnPrimary}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.checkLabel,
                        checked && styles.checkLabelSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ESTADO */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>ESTADO</Text>
              {VISIT_STATUS_OPTIONS.map(({ value, label }) => {
                const checked = draftStatuses.includes(value);
                return (
                  <Pressable
                    key={value}
                    style={({ pressed }) => [
                      styles.checkRow,
                      pressed && styles.checkRowPressed,
                    ]}
                    onPress={() => toggleDraftStatus(value)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={label}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        checked && styles.checkboxChecked,
                      ]}
                    >
                      {checked && (
                        <MaterialCommunityIcons
                          name="check"
                          size={14}
                          color={colors.textOnPrimary}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.checkLabel,
                        checked && styles.checkLabelSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* FECHA */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>FECHA</Text>

              {/* Toggle date filter on/off */}
              <Pressable
                style={({ pressed }) => [
                  styles.checkRow,
                  pressed && styles.checkRowPressed,
                ]}
                onPress={() => {
                  setDraftDateActive(!draftDateActive);
                  if (!draftDateActive && Platform.OS === 'android')
                    setShowFromPicker(true);
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: draftDateActive }}
                accessibilityLabel="Filtrar por rango de fechas"
              >
                <View
                  style={[
                    styles.checkbox,
                    draftDateActive && styles.checkboxChecked,
                  ]}
                >
                  {draftDateActive && (
                    <MaterialCommunityIcons
                      name="check"
                      size={14}
                      color={colors.textOnPrimary}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.checkLabel,
                    draftDateActive && styles.checkLabelSelected,
                  ]}
                >
                  Filtrar por rango de fechas
                </Text>
              </Pressable>

              {draftDateActive && (
                <View style={styles.dateFieldsContainer}>
                  {/* From */}
                  <View style={styles.dateFieldGroup}>
                    <Text style={styles.dateFieldLabel}>Desde</Text>
                    {Platform.OS === 'android' ? (
                      <Pressable
                        style={({ pressed }) => [
                          styles.dateDisplayButton,
                          pressed && styles.dateDisplayButtonPressed,
                        ]}
                        onPress={() => setShowFromPicker(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Seleccionar fecha desde"
                      >
                        <Text style={styles.dateDisplayText}>
                          {dayjs(draftFrom).format('DD/MM/YYYY')}
                        </Text>
                        <MaterialCommunityIcons
                          name="calendar"
                          size={20}
                          color={colors.primary}
                        />
                      </Pressable>
                    ) : (
                      <AppDatePicker
                        value={draftFrom}
                        mode="date"
                        display="inline"
                        onChange={setDraftFrom}
                        accentColor={colors.primary}
                        locale="es"
                      />
                    )}
                  </View>

                  {/* To */}
                  <View style={styles.dateFieldGroup}>
                    <Text style={styles.dateFieldLabel}>Hasta</Text>
                    {Platform.OS === 'android' ? (
                      <Pressable
                        style={({ pressed }) => [
                          styles.dateDisplayButton,
                          pressed && styles.dateDisplayButtonPressed,
                        ]}
                        onPress={() => setShowToPicker(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Seleccionar fecha hasta"
                      >
                        <Text style={styles.dateDisplayText}>
                          {dayjs(draftTo).format('DD/MM/YYYY')}
                        </Text>
                        <MaterialCommunityIcons
                          name="calendar"
                          size={20}
                          color={colors.primary}
                        />
                      </Pressable>
                    ) : (
                      <AppDatePicker
                        value={draftTo}
                        mode="date"
                        display="inline"
                        onChange={setDraftTo}
                        accentColor={colors.primary}
                        locale="es"
                      />
                    )}
                  </View>
                </View>
              )}

              {/* Android date pickers rendered as modal dialogs */}
              {Platform.OS === 'android' && showFromPicker && (
                <AppDatePicker
                  value={draftFrom}
                  mode="date"
                  display="calendar"
                  onChange={(date) => {
                    setDraftFrom(date);
                    setShowFromPicker(false);
                    setShowToPicker(true);
                  }}
                  isAndroidModal
                  onDismiss={() => setShowFromPicker(false)}
                  accentColor={colors.primary}
                  locale="es"
                />
              )}
              {Platform.OS === 'android' && showToPicker && (
                <AppDatePicker
                  value={draftTo}
                  mode="date"
                  display="calendar"
                  onChange={(date) => {
                    setDraftTo(date);
                    setShowToPicker(false);
                  }}
                  isAndroidModal
                  onDismiss={() => setShowToPicker(false)}
                  accentColor={colors.primary}
                  locale="es"
                />
              )}
            </View>

            {/* VENDEDOR — admin/root only */}
            {isAdminOrRoot && users.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>VENDEDOR</Text>
                {users
                  .filter((u) => u.status === 'active')
                  .map((user) => {
                    const checked = draftOwners.includes(user.id);
                    const name = user.full_name ?? user.email;
                    return (
                      <Pressable
                        key={user.id}
                        style={({ pressed }) => [
                          styles.checkRow,
                          pressed && styles.checkRowPressed,
                        ]}
                        onPress={() => toggleDraftOwner(user.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked }}
                        accessibilityLabel={name}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            checked && styles.checkboxChecked,
                          ]}
                        >
                          {checked && (
                            <MaterialCommunityIcons
                              name="check"
                              size={14}
                              color={colors.textOnPrimary}
                            />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.checkLabel,
                            checked && styles.checkLabelSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {name}
                        </Text>
                      </Pressable>
                    );
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
                {draftFilterCount > 0
                  ? `Aplicar (${draftFilterCount})`
                  : 'Aplicar'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
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

  // ── List ───────────────────────────────────────────────────────────────────

  rowGap: {
    height: spacing[2],
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[8],
  },
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
  emptyError: {
    fontSize: fontSize.base,
    color: colors.error,
  },
  listEmptyContent: {
    flex: 1,
  },
  footerLoader: {
    paddingVertical: spacing[4],
    alignItems: 'center',
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
    maxHeight: '80%',
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
  checkLabelSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold as '600',
  },

  // ── Date fields (inside filter modal) ─────────────────────────────────────

  dateFieldsContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    gap: spacing[4],
  },
  dateFieldGroup: {
    gap: spacing[2],
  },
  dateFieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },
  dateDisplayButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
  },
  dateDisplayButtonPressed: {
    borderColor: colors.primary,
  },
  dateDisplayText: {
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
});
