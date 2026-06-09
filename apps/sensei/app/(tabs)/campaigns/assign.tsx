import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { useAssignmentsStore } from '@/stores/assignmentsStore';
import { useBranchesStore } from '@/stores/branchesStore';
import { useClientsStore } from '@/stores/clientsStore';
import { useUsersStore } from '@/stores/usersStore';
import type { Client } from '@/types';

export default function AssignScreen() {
  const router = useRouter();
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();

  const clients = useClientsStore((s) => s.clients);
  const fetchClients = useClientsStore((s) => s.fetchClients);

  const users = useUsersStore((s) => s.users);
  const fetchUsers = useUsersStore((s) => s.fetchUsers);

  const branches = useBranchesStore((s) => s.branches);
  const fetchBranches = useBranchesStore((s) => s.fetchBranches);

  const assignments = useAssignmentsStore((s) => s.assignments);
  const fetchAssignments = useAssignmentsStore((s) => s.fetchAssignments);
  const createAssignments = useAssignmentsStore((s) => s.createAssignments);
  const error = useAssignmentsStore((s) => s.error);

  const [search, setSearch] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchUsers();
    fetchBranches();
    if (campaignId) fetchAssignments(campaignId);
  }, [campaignId]);

  // Already assigned client IDs for this campaign
  const alreadyAssigned = useMemo(
    () => new Set(assignments.map((a) => a.client_id)),
    [assignments]
  );

  const filtered = useMemo(() => {
    let list = clients;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.city ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [clients, search]);

  const toggleClient = (id: string) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const unassigned = filtered.filter((c) => !alreadyAssigned.has(c.id));
    setSelectedClientIds(new Set(unassigned.map((c) => c.id)));
  };

  const handleAssign = async () => {
    if (!selectedUserId || selectedClientIds.size === 0 || !campaignId) return;

    setSaving(true);
    const count = await createAssignments(
      campaignId,
      Array.from(selectedClientIds),
      selectedUserId,
      selectedBranchId || undefined
    );
    setSaving(false);

    if (count > 0) {
      setSelectedClientIds(new Set());
      fetchAssignments(campaignId);
    }
  };

  const vendedores = users.filter((u) => u.role === 'user');

  function ClientRow({ client }: { client: Client }) {
    const isSelected = selectedClientIds.has(client.id);
    const isAssigned = alreadyAssigned.has(client.id);

    return (
      <Pressable
        style={[styles.clientRow, isAssigned && styles.clientRowAssigned]}
        onPress={() => !isAssigned && toggleClient(client.id)}
        disabled={isAssigned}
      >
        <MaterialCommunityIcons
          name={isAssigned ? 'check-circle' : isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={22}
          color={isAssigned ? colors.success : isSelected ? colors.primary : colors.textDisabled}
        />
        <View style={styles.clientContent}>
          <Text style={[styles.clientName, isAssigned && styles.clientNameAssigned]}>
            {client.name}
          </Text>
          {client.city && <Text style={styles.clientCity}>{client.city}</Text>}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      {/* Target user selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Asignar a vendedor</Text>
        <View style={styles.chipRow}>
          {vendedores.map((u) => (
            <Pressable
              key={u.id}
              style={[styles.chip, selectedUserId === u.id && styles.chipActive]}
              onPress={() => setSelectedUserId(u.id)}
            >
              <Text style={[styles.chipText, selectedUserId === u.id && styles.chipTextActive]}>
                {u.full_name || u.email}
              </Text>
            </Pressable>
          ))}
          {vendedores.length === 0 && (
            <Text style={styles.emptyText}>No hay vendedores registrados</Text>
          )}
        </View>
      </View>

      {/* Branch selector */}
      {branches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sucursal (opcional)</Text>
          <View style={styles.chipRow}>
            {branches.map((b) => (
              <Pressable
                key={b.id}
                style={[styles.chip, selectedBranchId === b.id && styles.chipActive]}
                onPress={() => setSelectedBranchId(selectedBranchId === b.id ? '' : b.id)}
              >
                <Text style={[styles.chipText, selectedBranchId === b.id && styles.chipTextActive]}>
                  {b.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Client list */}
      <View style={styles.clientsHeader}>
        <Text style={styles.sectionTitle}>
          Clientes ({selectedClientIds.size} seleccionados)
        </Text>
        <Pressable onPress={selectAll}>
          <Text style={styles.selectAllText}>Seleccionar todos</Text>
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cliente…"
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <ClientRow client={item} />}
      />

      {/* Assign button */}
      {selectedClientIds.size > 0 && selectedUserId && (
        <View style={styles.footer}>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Pressable
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleAssign}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.buttonText}>
                Asignar {selectedClientIds.size} cliente{selectedClientIds.size !== 1 ? 's' : ''}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  section: { paddingHorizontal: spacing[4], paddingVertical: spacing[3], gap: spacing[2] },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.textOnPrimary, fontWeight: fontWeight.semibold },
  clientsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
  },
  selectAllText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[2],
    ...shadows.subtle,
  },
  searchInput: { flex: 1, fontSize: fontSize.base, color: colors.textPrimary, height: 36 },
  listContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[20] },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    gap: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 48,
  },
  clientRowAssigned: { opacity: 0.5 },
  clientContent: { flex: 1 },
  clientName: { fontSize: fontSize.base, color: colors.textPrimary },
  clientNameAssigned: { textDecorationLine: 'line-through' },
  clientCity: { fontSize: fontSize.sm, color: colors.textSecondary },
  emptyText: { fontSize: fontSize.sm, color: colors.textDisabled },
  footer: {
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  errorText: { color: colors.error, fontSize: fontSize.sm, marginBottom: spacing[2] },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textOnPrimary },
});
