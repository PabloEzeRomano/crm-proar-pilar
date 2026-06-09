import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { useClientsStore } from '@/stores/clientsStore';
import type { Client } from '@/types';

function ClientRow({ client, onPress }: { client: Client; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name="domain" size={20} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowName} numberOfLines={1}>{client.name}</Text>
        {(client.city || client.industry) && (
          <Text style={styles.rowSub} numberOfLines={1}>
            {[client.industry, client.city].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textDisabled} />
    </Pressable>
  );
}

export default function ClientsScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'root';

  const clients = useClientsStore((s) => s.clients);
  const loading = useClientsStore((s) => s.loading);
  const fetchClients = useClientsStore((s) => s.fetchClients);

  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.trim().toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.city ?? '').toLowerCase().includes(q) ||
        (c.industry ?? '').toLowerCase().includes(q)
    );
  }, [clients, search]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cliente…"
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

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
                {search.trim() ? 'Sin resultados' : 'No hay clientes'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ClientRow
              client={item}
              onPress={() => router.push(`/clients/${item.id}`)}
            />
          )}
        />
      )}

      {isAdmin && (
        <Pressable
          style={styles.fab}
          onPress={() => router.push('/clients/new')}
          accessibilityRole="button"
          accessibilityLabel="Nuevo cliente"
        >
          <MaterialCommunityIcons name="plus" size={28} color={colors.textOnPrimary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  searchInput: { flex: 1, fontSize: fontSize.base, color: colors.textPrimary, height: 36 },
  listContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[20] },
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
  rowName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  rowSub: { fontSize: fontSize.sm, color: colors.textSecondary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing[12] },
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
