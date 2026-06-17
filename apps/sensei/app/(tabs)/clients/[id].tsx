import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  interactionResultColors,
  shadows,
  spacing,
} from '@/constants/theme';
import { useClientsStore } from '@/stores/clientsStore';
import { useInteractionsStore } from '@/stores/interactionsStore';
import type {
  InteractionWithClient,
  ContactResult,
  ContactInfo,
} from '@/types';

const contactResultLabel: Record<ContactResult, string> = {
  contacted: 'Contactado',
  not_contacted: 'No contactado',
  no_answer: 'No atiende',
  wrong_number: 'Número equivocado',
};

const channelIcon: Record<string, string> = {
  phone: 'phone',
  whatsapp: 'whatsapp',
  in_person: 'account',
  email: 'email-outline',
};

function InteractionRow({
  interaction,
}: {
  interaction: InteractionWithClient;
}) {
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
          <Text style={styles.interactionInterest}>
            {interaction.interest_result}
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

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const clients = useClientsStore((s) => s.clients);
  const client = clients.find((c) => c.id === id);

  const interactions = useInteractionsStore((s) => s.interactions);
  const interactionsLoading = useInteractionsStore((s) => s.loading);
  const fetchInteractions = useInteractionsStore((s) => s.fetchInteractions);

  useEffect(() => {
    if (id) fetchInteractions({ clientId: id });
  }, [id]);

  if (!client) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Cliente no encontrado</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: client.name }} />
      <View style={styles.container}>
        {/* Client info card */}
        <View style={styles.card}>
          <Text style={styles.clientName}>{client.name}</Text>
          {client.industry && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="tag-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.infoText}>{client.industry}</Text>
            </View>
          )}
          {client.address && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.infoText}>
                {[client.address, client.city].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
          {client.contacts && client.contacts.length > 0 && (
            <View style={styles.contactsSection}>
              {client.contacts.map((contact: ContactInfo, i: number) => (
                <View key={i} style={styles.infoRow}>
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.infoText}>
                    {[contact.name, contact.phone, contact.email]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Interactions history */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Historial de gestiones</Text>
        </View>

        {interactionsLoading ? (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={{ marginTop: spacing[4] }}
          />
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
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface,
    margin: spacing[4],
    padding: spacing[4],
    borderRadius: borderRadius.md,
    gap: spacing[2],
    ...shadows.subtle,
  },
  clientName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  infoText: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  contactsSection: { marginTop: spacing[1], gap: spacing[1] },
  sectionHeader: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
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
  interactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  interactionResult: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  interactionInterest: { fontSize: fontSize.sm, color: colors.textSecondary },
  interactionNotes: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  interactionDate: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  emptyText: { fontSize: fontSize.base, color: colors.textSecondary },
});
