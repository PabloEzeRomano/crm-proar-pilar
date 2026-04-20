import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
  fontWeight,
  shadows,
  spacing,
} from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useProductsStore } from '@/stores/productsStore';
import type { Product, ProductType } from '@/types';

// ---------------------------------------------------------------------------
// Type tabs
// ---------------------------------------------------------------------------

const TYPE_TABS: { key: 'all' | ProductType; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'commodity', label: 'Commodities' },
  { key: 'formulated', label: 'Formulados' },
];

// ---------------------------------------------------------------------------
// Product row
// ---------------------------------------------------------------------------

function ProductRow({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons
          name={product.type === 'commodity' ? 'grain' : 'flask-outline'}
          size={20}
          color={colors.primary}
        />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowName} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.rowSub}>
          {product.presentations.length}{' '}
          {product.presentations.length === 1
            ? 'presentación'
            : 'presentaciones'}
          {product.code ? `  ·  ${product.code}` : ''}
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={colors.textDisabled}
      />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ProductsIndexScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const isAdminOrRoot = profile?.role === 'admin' || profile?.role === 'root';

  const products = useProductsStore((s) => s.products);
  const loading = useProductsStore((s) => s.loading);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);

  const [search, setSearch] = useState('');
  const [typeTab, setTypeTab] = useState<'all' | ProductType>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (typeTab !== 'all') list = list.filter((p) => p.type === typeTab);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, typeTab, search]);

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={colors.textSecondary}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar producto…"
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Type tabs */}
      <View style={styles.tabs}>
        {TYPE_TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, typeTab === tab.key && styles.tabActive]}
            onPress={() => setTypeTab(tab.key)}
            accessibilityRole="tab"
          >
            <Text
              style={[
                styles.tabText,
                typeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                {search.trim() ? 'Sin resultados' : 'No hay productos'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ProductRow
              product={item}
              onPress={() => router.push(`/products/${item.id}` as never)}
            />
          )}
        />
      )}

      {/* FAB — admin/root only */}
      {isAdminOrRoot && (
        <Pressable
          style={styles.fab}
          onPress={() => router.push('/products/new' as never)}
          accessibilityRole="button"
          accessibilityLabel="Nuevo producto"
        >
          <MaterialCommunityIcons
            name="plus"
            size={28}
            color={colors.textOnPrimary}
          />
        </Pressable>
      )}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    marginBottom: spacing[2],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[2],
    ...shadows.subtle,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    height: 36,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  tab: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    minHeight: 36,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.semibold as '600',
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[20] ?? 80,
  },
  separator: {
    height: spacing[2],
  },
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
    backgroundColor: colors.primaryLight ?? '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    gap: spacing[1],
  },
  rowName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[12] ?? 48,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
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
