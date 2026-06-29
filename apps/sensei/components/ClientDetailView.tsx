import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  channelIcon,
  contactResultLabel,
  interestResultLabel,
} from '@/constants/labels';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  interactionResultColors,
  shadows,
  spacing,
} from '@/constants/theme';
import { useBranchesStore } from '@/stores/branchesStore';
import { useClientsStore } from '@/stores/clientsStore';
import { useInteractionsStore } from '@/stores/interactionsStore';
import type { ContactInfo, InteractionWithClient } from '@/types';

function InteractionRow({ interaction }: { interaction: InteractionWithClient }) {
  const resultColor =
    interaction.contact_result === 'contacted'
      ? interactionResultColors.contacted
      : interactionResultColors.not_contacted;

  return (
    <View style={styles.interactionRow}>
      <View style={[styles.interactionDot, { backgroundColor: resultColor }]} />
      <View style={styles.interactionContent}>
        <View style={styles.interactionHeader}>
          <Text style={styles.interactionResult}>
            {contactResultLabel[interaction.contact_result]}
          </Text>
          <MaterialCommunityIcons
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- icon name map value isn't narrowed to MCIcons glyph union
            name={channelIcon[interaction.channel] as any}
            size={16}
            color={colors.textSecondary}
          />
        </View>
        {interaction.interest_result && (
          <Text style={styles.interactionMeta}>
            {interestResultLabel[interaction.interest_result]}
          </Text>
        )}
        {interaction.notes && (
          <Text style={styles.interactionNotes} numberOfLines={2}>
            {interaction.notes}
          </Text>
        )}
        <Text style={styles.interactionDate}>
          {new Date(interaction.created_at).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
}

interface Props {
  clientId: string;
}

export default function ClientDetailView({ clientId }: Props) {
  const router = useRouter();

  const clients = useClientsStore((s) => s.clients);
  const clientsLoading = useClientsStore((s) => s.loading);
  const fetchClients = useClientsStore((s) => s.fetchClients);
  const client = clients.find((c) => c.id === clientId);

  const interactions = useInteractionsStore((s) => s.interactions);
  const interactionsLoading = useInteractionsStore((s) => s.loading);
  const fetchInteractions = useInteractionsStore((s) => s.fetchInteractions);

  const branches = useBranchesStore((s) => s.branches);
  const fetchBranches = useBranchesStore((s) => s.fetchBranches);
  const branchName = branches.find((b) => b.id === client?.branch_id)?.name;

  const [clientsReady, setClientsReady] = useState(clients.length > 0);

  useEffect(() => {
    if (clients.length === 0) {
      fetchClients().finally(() => setClientsReady(true));
    }
    fetchBranches();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (clientId) fetchInteractions({ clientId });
    }, [clientId])
  );

  if (!client) {
    if (!clientsReady || clientsLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Cliente no encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.clientName}>{client.name}</Text>
        {client.cuit && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="card-account-details-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>DNI {client.cuit}</Text>
          </View>
        )}
        {client.address && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              {[client.address, client.city].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}
        {branchName ? (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="office-building-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{branchName}</Text>
          </View>
        ) : null}
        {client.commercial_classification ? (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="star-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{client.commercial_classification}</Text>
          </View>
        ) : null}
        {client.last_payment_method ? (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="credit-card-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{client.last_payment_method}</Text>
          </View>
        ) : null}
        {client.contacts && client.contacts.length > 0 && (
          <View style={styles.contactsSection}>
            {client.contacts.map((contact: ContactInfo, i: number) => (
              <View key={i} style={styles.infoRow}>
                <MaterialCommunityIcons name="account-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>
                  {[contact.name, contact.phone, contact.email].filter(Boolean).join(' · ')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <Pressable
        style={styles.newInteractionButton}
        onPress={() => router.push(`/interactions/new?clientId=${client.id}`)}
        accessibilityRole="button"
        accessibilityLabel="Nueva gestión"
      >
        <MaterialCommunityIcons name="plus" size={20} color={colors.textOnPrimary} />
        <Text style={styles.newInteractionLabel}>Nueva gestión</Text>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Historial de gestiones</Text>
      </View>

      {interactionsLoading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing[4] }} />
      ) : (
        <FlatList
          data={interactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Sin gestiones registradas</Text>
            </View>
          }
          renderItem={({ item }) => <InteractionRow interaction={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing[12] },
  emptyText: { fontSize: fontSize.base, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface,
    margin: spacing[4],
    padding: spacing[4],
    borderRadius: borderRadius.md,
    gap: spacing[2],
    ...shadows.subtle,
  },
  clientName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  infoText: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  contactsSection: { marginTop: spacing[1], gap: spacing[1] },
  newInteractionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    borderRadius: borderRadius.md,
    minHeight: 48,
  },
  newInteractionLabel: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textOnPrimary },
  sectionHeader: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  sectionTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  listContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[20] },
  separator: { height: spacing[2] },
  interactionRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[3],
    ...shadows.subtle,
  },
  interactionDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  interactionContent: { flex: 1, gap: 2 },
  interactionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  interactionResult: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  interactionMeta: { fontSize: fontSize.sm, color: colors.textSecondary },
  interactionNotes: { fontSize: fontSize.sm, color: colors.textSecondary, fontStyle: 'italic' },
  interactionDate: { fontSize: fontSize.xs, color: colors.textDisabled, marginTop: spacing[1] },
});
