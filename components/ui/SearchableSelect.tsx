/**
 * components/ui/SearchableSelect.tsx — Searchable single/multi select (EP-046.1)
 *
 * Renders as a pressable trigger button.
 * On press: opens a bottom-sheet modal with:
 *   - Text input for filtering
 *   - Selected chips (multi only, each with ✕)
 *   - Unselected options list (filtered by search)
 *
 * Single-select: tapping an option selects it and closes the modal.
 * Multi-select:  tapping an option moves it to the selected section.
 *                Modal stays open until user taps outside or closes.
 */

import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchableSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  /** When provided, shows an "Agregar nuevo…" option at the bottom of the list.
   *  When tapped, the modal closes and this callback is invoked. */
  onAddNew?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SearchableSelect({
  label,
  options,
  selected,
  onChange,
  multiple = false,
  placeholder,
  onAddNew,
}: SearchableSelectProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  // ── Trigger label ────────────────────────────────────────────────────────

  function getTriggerLabel(): string {
    if (selected.length === 0) return placeholder ?? label;
    if (!multiple) return selected[0];
    return `${label} (${selected.length})`;
  }

  const hasSelection = selected.length > 0;

  // ── Modal helpers ────────────────────────────────────────────────────────

  const unselectedOptions = options.filter((opt) => !selected.includes(opt));

  const filteredOptions = searchText.trim()
    ? unselectedOptions.filter((opt) =>
        opt.toLowerCase().includes(searchText.toLowerCase())
      )
    : unselectedOptions;

  function handleSelect(option: string) {
    if (multiple) {
      onChange([...selected, option]);
    } else {
      onChange([option]);
      setModalVisible(false);
    }
  }

  function handleDeselect(option: string) {
    onChange(selected.filter((s) => s !== option));
  }

  function handleClearAll() {
    onChange([]);
  }

  function handleClose() {
    setSearchText('');
    setModalVisible(false);
  }

  // ── Root render ──────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Trigger button ───────────────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          hasSelection && styles.triggerActive,
          pressed && styles.triggerPressed,
        ]}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={getTriggerLabel()}
        hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
      >
        <Text
          style={[
            styles.triggerLabel,
            hasSelection && styles.triggerLabelActive,
          ]}
          numberOfLines={1}
        >
          {getTriggerLabel()}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={18}
          color={hasSelection ? colors.primary : colors.textSecondary}
        />
      </Pressable>

      {/* ── Modal ───────────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
      >
        <Pressable style={styles.overlay} onPress={handleClose} />

        <View style={styles.sheet}>
          {/* Sheet header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <Pressable
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Cerrar"
            >
              <MaterialCommunityIcons
                name="close"
                size={22}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          {/* Search input */}
          <View style={styles.searchBar}>
            <MaterialCommunityIcons
              name="magnify"
              size={18}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Buscar..."
              placeholderTextColor={colors.textDisabled}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <Pressable
                onPress={() => setSearchText('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Limpiar búsqueda"
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
            )}
          </View>

          {/* Selected chips (multi-select only) */}
          {multiple && selected.length > 0 ? (
            <View style={styles.selectedSection}>
              <View style={styles.selectedHeader}>
                <Text style={styles.sectionTitle}>SELECCIONADOS</Text>
                <Pressable
                  onPress={handleClearAll}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Limpiar selección"
                >
                  <Text style={styles.clearText}>Limpiar</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {selected.map((item) => (
                  <Pressable
                    key={item}
                    style={styles.chip}
                    onPress={() => handleDeselect(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar ${item}`}
                  >
                    <Text style={styles.chipText} numberOfLines={1}>
                      {item}
                    </Text>
                    <MaterialCommunityIcons
                      name="close"
                      size={14}
                      color={colors.primary}
                    />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Options list */}
          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item}
            style={styles.optionList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.optionRow,
                  pressed && styles.optionRowPressed,
                ]}
                onPress={() => handleSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={item}
              >
                <Text style={styles.optionText} numberOfLines={1}>
                  {item}
                </Text>
                {multiple && (
                  <MaterialCommunityIcons
                    name="plus"
                    size={18}
                    color={colors.textSecondary}
                  />
                )}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.optionDivider} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchText.trim()
                    ? 'Sin resultados'
                    : 'Sin opciones disponibles'}
                </Text>
              </View>
            )}
            ListFooterComponent={
              onAddNew ? (
                <>
                  <View style={styles.optionDivider} />
                  <Pressable
                    style={({ pressed }) => [
                      styles.optionRow,
                      styles.addNewRow,
                      pressed && styles.optionRowPressed,
                    ]}
                    onPress={() => {
                      handleClose();
                      onAddNew();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Agregar nuevo"
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      size={18}
                      color={colors.primary}
                      style={styles.addNewIcon}
                    />
                    <Text style={styles.addNewText}>Agregar nuevo…</Text>
                  </Pressable>
                </>
              ) : undefined
            }
          />
        </View>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Trigger
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  triggerActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  triggerPressed: {
    opacity: 0.75,
  },
  triggerLabel: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginRight: spacing[2],
  },
  triggerLabelActive: {
    color: colors.primary,
    fontWeight: fontWeight.medium as '500',
  },

  // Modal overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  // Bottom sheet
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    marginBottom: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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

  // Selected chips section
  selectedSection: {
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing[1],
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  clearText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.primary,
  },
  chipsRow: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    height: 36,
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.primary,
    maxWidth: 120,
  },

  // Options list
  optionList: {
    flexGrow: 0,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 52,
    backgroundColor: colors.surface,
  },
  optionRowPressed: {
    backgroundColor: colors.background,
  },
  optionText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    marginRight: spacing[2],
  },
  optionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing[4],
  },

  // Add new option
  addNewRow: {
    backgroundColor: colors.surface,
  },
  addNewIcon: {
    marginRight: spacing[1],
  },
  addNewText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: fontWeight.medium as '500',
  },

  // Empty state
  emptyContainer: {
    padding: spacing[6],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
