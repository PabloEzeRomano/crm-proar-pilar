/**
 * components/CatalogScreen.tsx — Reusable admin screen for a configurable
 * catalog (payment methods, financiers, …). Add / list / toggle active /
 * delete. Backed by a store created via createCatalogStore.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  borderRadius,
  colors,
  fontSize,
  shadows,
  spacing,
} from '@/constants/theme';
import { showConfirm } from '@/lib/dialog';
import type { CatalogItem, CatalogState } from '@/stores/catalogStore';

interface CatalogScreenProps {
  useStore: () => CatalogState;
  addPlaceholder: string;
  emptyText: string;
  deleteTitle: string;
}

export default function CatalogScreen({
  useStore,
  addPlaceholder,
  emptyText,
  deleteTitle,
}: CatalogScreenProps) {
  const items = useStore().items;
  const loading = useStore().loading;
  const error = useStore().error;
  const fetchItems = useStore().fetchItems;
  const createItem = useStore().createItem;
  const toggleActive = useStore().toggleActive;
  const deleteItem = useStore().deleteItem;

  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    await createItem(newValue.trim());
    setNewValue('');
    setAdding(false);
  };

  const confirmDelete = async (item: CatalogItem) => {
    const ok = await showConfirm({
      title: deleteTitle,
      message: `¿Eliminar "${item.name}"?`,
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (ok) deleteItem(item.id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          value={newValue}
          onChangeText={setNewValue}
          placeholder={addPlaceholder}
          placeholderTextColor={colors.textDisabled}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          editable={!adding}
        />
        <Pressable
          style={[
            styles.addBtn,
            (!newValue.trim() || adding) && styles.addBtnDisabled,
          ]}
          onPress={handleAdd}
          disabled={!newValue.trim() || adding}
        >
          {adding ? (
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
          ) : (
            <MaterialCommunityIcons
              name="plus"
              size={22}
              color={colors.textOnPrimary}
            />
          )}
        </Pressable>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.row, !item.active && styles.rowInactive]}>
              <Pressable
                onPress={() => toggleActive(item.id, !item.active)}
                hitSlop={8}
                style={styles.toggleBtn}
              >
                <MaterialCommunityIcons
                  name={
                    item.active
                      ? 'checkbox-marked-circle'
                      : 'checkbox-blank-circle-outline'
                  }
                  size={22}
                  color={item.active ? colors.success : colors.textDisabled}
                />
              </Pressable>
              <Text
                style={[styles.rowText, !item.active && styles.rowTextInactive]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Pressable
                onPress={() => confirmDelete(item)}
                hitSlop={8}
                style={styles.deleteBtn}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={18}
                  color={colors.error}
                />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: fontSize.base,
    color: colors.textPrimary,
    minHeight: 48,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[20],
  },
  separator: { height: spacing[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[3],
    ...shadows.subtle,
    minHeight: 52,
  },
  rowInactive: { opacity: 0.5 },
  toggleBtn: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, fontSize: fontSize.base, color: colors.textPrimary },
  rowTextInactive: {
    textDecorationLine: 'line-through',
    color: colors.textDisabled,
  },
  deleteBtn: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  emptyText: { fontSize: fontSize.base, color: colors.textSecondary },
});
