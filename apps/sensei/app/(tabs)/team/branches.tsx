import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  shadows,
  spacing,
} from '@/constants/theme';
import { useBranchesStore } from '@/stores/branchesStore';
import type { Branch } from '@/types';

function BranchRow({
  branch,
  onEdit,
  onDelete,
}: {
  branch: Branch;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons
          name="office-building"
          size={20}
          color={colors.primary}
        />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowName} numberOfLines={1}>
          {branch.name}
        </Text>
        {(branch.address || branch.city) && (
          <Text style={styles.rowSub} numberOfLines={1}>
            {[branch.address, branch.city].filter(Boolean).join(', ')}
          </Text>
        )}
      </View>
      <Pressable onPress={onEdit} hitSlop={8} style={styles.iconBtn}>
        <MaterialCommunityIcons
          name="pencil-outline"
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8} style={styles.iconBtn}>
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={20}
          color={colors.error}
        />
      </Pressable>
    </View>
  );
}

export default function BranchesScreen() {
  const router = useRouter();
  const branches = useBranchesStore((s) => s.branches);
  const loading = useBranchesStore((s) => s.loading);
  const fetchBranches = useBranchesStore((s) => s.fetchBranches);
  const deleteBranch = useBranchesStore((s) => s.deleteBranch);

  useEffect(() => {
    fetchBranches();
  }, []);

  const confirmDelete = (branch: Branch) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Eliminar "${branch.name}"?`)) {
        deleteBranch(branch.id);
      }
    } else {
      Alert.alert('Eliminar sucursal', `¿Eliminar "${branch.name}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteBranch(branch.id),
        },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={branches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No hay sucursales</Text>
            </View>
          }
          renderItem={({ item }) => (
            <BranchRow
              branch={item}
              onEdit={() => router.push(`/team/branch-form?id=${item.id}`)}
              onDelete={() => confirmDelete(item)}
            />
          )}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/team/branch-form')}
        accessibilityRole="button"
        accessibilityLabel="Nueva sucursal"
      >
        <MaterialCommunityIcons
          name="plus"
          size={28}
          color={colors.textOnPrimary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
    minHeight: 56,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1, gap: 2 },
  rowName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  rowSub: { fontSize: fontSize.sm, color: colors.textSecondary },
  iconBtn: {
    padding: spacing[2],
    minWidth: 40,
    minHeight: 40,
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
  fab: {
    position: 'absolute',
    bottom: spacing[6],
    right: spacing[4],
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.subtle,
  },
});
