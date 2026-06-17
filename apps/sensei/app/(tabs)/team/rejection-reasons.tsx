import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
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
import { useRejectionReasonsStore } from '@/stores/rejectionReasonsStore';
import type { RejectionReason } from '@/types';

function ReasonRow({
  reason,
  onToggle,
  onDelete,
}: {
  reason: RejectionReason;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.row, !reason.active && styles.rowInactive]}>
      <Pressable onPress={onToggle} hitSlop={8} style={styles.toggleBtn}>
        <MaterialCommunityIcons
          name={
            reason.active
              ? 'checkbox-marked-circle'
              : 'checkbox-blank-circle-outline'
          }
          size={22}
          color={reason.active ? colors.success : colors.textDisabled}
        />
      </Pressable>
      <Text
        style={[styles.rowText, !reason.active && styles.rowTextInactive]}
        numberOfLines={1}
      >
        {reason.value}
      </Text>
      <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={18}
          color={colors.error}
        />
      </Pressable>
    </View>
  );
}

export default function RejectionReasonsScreen() {
  const reasons = useRejectionReasonsStore((s) => s.reasons);
  const loading = useRejectionReasonsStore((s) => s.loading);
  const error = useRejectionReasonsStore((s) => s.error);
  const fetchReasons = useRejectionReasonsStore((s) => s.fetchReasons);
  const createReason = useRejectionReasonsStore((s) => s.createReason);
  const toggleActive = useRejectionReasonsStore((s) => s.toggleActive);
  const deleteReason = useRejectionReasonsStore((s) => s.deleteReason);

  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchReasons();
  }, []);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    await createReason(newValue.trim());
    setNewValue('');
    setAdding(false);
  };

  const confirmDelete = (reason: RejectionReason) => {
    const doDelete = () => deleteReason(reason.id);
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Eliminar "${reason.value}"?`)) doDelete();
    } else {
      Alert.alert('Eliminar motivo', `¿Eliminar "${reason.value}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Add form */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          value={newValue}
          onChangeText={setNewValue}
          placeholder="Nuevo motivo de rechazo…"
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
          data={reasons}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No hay motivos de rechazo</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ReasonRow
              reason={item}
              onToggle={() => toggleActive(item.id, !item.active)}
              onDelete={() => confirmDelete(item)}
            />
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
