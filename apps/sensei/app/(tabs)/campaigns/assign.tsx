import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
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
import { SearchableSelect } from '@crm/core';

import { showAlert, showConfirm } from '@/lib/dialog';
import { useAssignmentsStore } from '@/stores/assignmentsStore';
import { useBranchesStore } from '@/stores/branchesStore';
import { useClientsStore } from '@/stores/clientsStore';
import { useUsersStore } from '@/stores/usersStore';
import type { Client } from '@/types';

export default function AssignScreen() {
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
  const autoAssignByBranch = useAssignmentsStore((s) => s.autoAssignByBranch);
  const error = useAssignmentsStore((s) => s.error);

  const [search, setSearch] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedBranchIds, setSelectedBranchIds] = useState<Set<string>>(
    new Set()
  );
  const [saving, setSaving] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);

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
    if (selectedBranchIds.size > 0) {
      list = list.filter(
        (c) => c.branch_id && selectedBranchIds.has(c.branch_id)
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.city ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [clients, search, selectedBranchIds]);

  const branchNameById = useMemo(
    () => new Map(branches.map((b) => [b.id, b.name])),
    [branches]
  );
  const branchIdByName = useMemo(
    () => new Map(branches.map((b) => [b.name, b.id])),
    [branches]
  );

  const handleBranchChange = (names: string[]) => {
    const ids = names
      .map((n) => branchIdByName.get(n))
      .filter((id): id is string => !!id);
    setSelectedBranchIds(new Set(ids));
    // Drop selected clients no longer visible under the new filter
    setSelectedClientIds(new Set());
  };

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

    // Stamp each assignment with its own client's branch.
    const branchByClientId: Record<string, string | null> = {};
    for (const c of clients) {
      if (selectedClientIds.has(c.id)) branchByClientId[c.id] = c.branch_id;
    }

    setSaving(true);
    const count = await createAssignments(
      campaignId,
      Array.from(selectedClientIds),
      selectedUserId,
      branchByClientId
    );
    setSaving(false);

    if (count > 0) {
      setSelectedClientIds(new Set());
      fetchAssignments(campaignId);
    }
  };

  const vendedores = users.filter((u) => u.role === 'user');

  const handleAutoAssign = async () => {
    if (!campaignId) return;
    const activeVendedores = users.filter(
      (u) => u.role === 'user' && u.status === 'active'
    );
    if (activeVendedores.every((u) => !u.branch_id)) {
      showAlert(
        'Sin vendedores con sucursal',
        'Asigná una sucursal a los vendedores en Equipo › Usuarios primero.'
      );
      return;
    }
    const ok = await showConfirm({
      title: 'Asignar por sucursal',
      message:
        'Cada cliente sin asignar se reparte entre los vendedores de su misma sucursal. ¿Continuar?',
      confirmText: 'Asignar',
    });
    if (!ok) return;

    setAutoAssigning(true);
    const res = await autoAssignByBranch(
      campaignId,
      clients,
      activeVendedores.map((u) => ({ id: u.id, branch_id: u.branch_id }))
    );
    setAutoAssigning(false);

    if (res) {
      fetchAssignments(campaignId);
      const parts = [`${res.assigned} asignados`];
      if (res.skippedNoBranch)
        parts.push(`${res.skippedNoBranch} sin sucursal`);
      if (res.skippedNoVendor)
        parts.push(`${res.skippedNoVendor} sin vendedor en su sucursal`);
      showAlert('Asignación automática', parts.join(' · '));
    }
  };

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
          name={
            isAssigned
              ? 'check-circle'
              : isSelected
                ? 'checkbox-marked'
                : 'checkbox-blank-outline'
          }
          size={22}
          color={
            isAssigned
              ? colors.success
              : isSelected
                ? colors.primary
                : colors.textDisabled
          }
        />
        <View style={styles.clientContent}>
          <Text
            style={[styles.clientName, isAssigned && styles.clientNameAssigned]}
          >
            {client.name}
          </Text>
          {client.city ? (
            <Text style={styles.clientCity}>{client.city}</Text>
          ) : null}
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
              style={[
                styles.chip,
                selectedUserId === u.id && styles.chipActive,
              ]}
              onPress={() => setSelectedUserId(u.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedUserId === u.id && styles.chipTextActive,
                ]}
              >
                {u.full_name || u.email}
              </Text>
            </Pressable>
          ))}
          {vendedores.length === 0 && (
            <Text style={styles.emptyText}>No hay vendedores registrados</Text>
          )}
        </View>
      </View>

      {/* Branch filter (multiselect) */}
      {branches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filtrar por sucursal</Text>
          <SearchableSelect
            label="Sucursales"
            placeholder="Todas las sucursales"
            multiple
            options={branches.map((b) => b.name)}
            selected={Array.from(selectedBranchIds)
              .map((id) => branchNameById.get(id))
              .filter((n): n is string => !!n)}
            onChange={handleBranchChange}
          />
        </View>
      )}

      {/* Auto-assign by branch */}
      <View style={styles.autoAssignSection}>
        <Pressable
          style={[styles.autoAssignBtn, autoAssigning && styles.buttonDisabled]}
          onPress={handleAutoAssign}
          disabled={autoAssigning}
          accessibilityRole="button"
        >
          {autoAssigning ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <MaterialCommunityIcons
                name="account-switch"
                size={18}
                color={colors.primary}
              />
              <Text style={styles.autoAssignText}>
                Asignar automáticamente por sucursal
              </Text>
            </>
          )}
        </Pressable>
      </View>

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
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={colors.textSecondary}
        />
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
                Asignar {selectedClientIds.size} cliente
                {selectedClientIds.size !== 1 ? 's' : ''}
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
  section: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
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
  chipTextActive: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.semibold,
  },
  autoAssignSection: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  autoAssignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    minHeight: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  autoAssignText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  clientsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
  },
  selectAllText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
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
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    height: 36,
  },
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
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    marginBottom: spacing[2],
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});
