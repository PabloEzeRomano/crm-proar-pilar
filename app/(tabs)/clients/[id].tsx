/**
 * app/(tabs)/clients/[id].tsx — Client detail screen
 *
 * Story 4.4 — EP-004
 * Story 5.6 — EP-005 (visits history section)
 *
 * Features:
 *   - Reads client from store by id (no extra network call)
 *   - Sections: Información, Contacto, Ubicación, Notas, Historial de visitas
 *   - Phone / email open native links
 *   - "Abrir en Maps" opens Google Maps
 *   - Header right: "Editar" navigates to form modal
 *   - Visits history: up to 10 most recent visits with StatusBadge and notes preview
 */

import React, { useEffect, useLayoutEffect } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { StatusBadge, STATUS_CONFIG } from '@/components/ui/StatusBadge'

import { useClientsStore } from '@/stores/clientsStore'
import { useVisits } from '@/hooks/useVisits'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'
import { VisitStatus, VisitWithClient } from '@/types'
import dayjs from '@/lib/dayjs'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function handleContactPhone(phone: string) {
  Alert.alert(phone, undefined, [
    { text: 'Llamar', onPress: () => Linking.openURL(`tel:${phone}`) },
    { text: 'WhatsApp', onPress: () => Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`) },
    { text: 'Cancelar', style: 'cancel' },
  ])
}

function handleContactEmail(email: string) {
  Linking.openURL(`mailto:${email}`)
}

// ---------------------------------------------------------------------------
// StatusBadge (inline — shared pattern from visits screens)
// ---------------------------------------------------------------------------

]}>
      <MaterialCommunityIcons name={config.icon} size={14} color={config.text} />
      <Text style={[sbStyles.label, { color: config.text }]}>{config.label}</Text>
    </View>
  )
}



// ---------------------------------------------------------------------------
// Date formatting helper
// ---------------------------------------------------------------------------

function formatVisitDate(scheduledAt: string): string {
  return dayjs(scheduledAt).format('D MMM YYYY · HH:mm')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const navigation = useNavigation()

  const client = useClientsStore((state) =>
    state.clients.find((c) => c.id === id),
  )
  const loading = useClientsStore((state) => state.loading)
  const fetchClient = useClientsStore((state) => state.fetchClient)

  // Visits for this client — fetch directly by client_id to bypass global pagination
  const { visits, fetchVisitsByClient } = useVisits(id)

  useEffect(() => {
    if (id) fetchVisitsByClient(id)
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch client if not in store
  useEffect(() => {
    if (id && !client) {
      fetchClient(id)
    }
  }, [id, client, fetchClient])

  // Set "Editar" button in the header
  useLayoutEffect(() => {
    if (!client) return

    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => router.push(`/clients/form?clientId=${id}`)}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Editar cliente"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.headerButtonText}>Editar</Text>
        </Pressable>
      ),
    })
  }, [client, id, navigation, router])

  // -------------------------------------------------------------------------
  // Not found
  // -------------------------------------------------------------------------

  if (!client) {
    if (loading) {
      return (
        <View style={styles.notFoundContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )
    }
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Cliente no encontrado</Text>
      </View>
    )
  }

  // -------------------------------------------------------------------------
  // Link handlers
  // -------------------------------------------------------------------------

  function handleMaps() {
    const query = `${client?.address ?? ''} ${client?.city ?? ''}`.trim()
    if (!query) return
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(query)}`)
  }

  const hasMapTarget = Boolean(client.address || client.city)

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function InfoRow({
    label,
    value,
  }: {
    label: string
    value: string | null | undefined
  }) {
    if (!value) return null
    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    )
  }

  function SectionHeader({ title }: { title: string }) {
    return <Text style={styles.sectionHeader}>{title}</Text>
  }

  // -------------------------------------------------------------------------
  // Root render
  // -------------------------------------------------------------------------

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      {/* ── Sección: Información ─────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Información" />
        <Text style={styles.clientName}>{client.name}</Text>
        {client.industry ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{client.industry}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.divider} />

      {/* ── Sección: Contacto ────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Contacto" />

        {client.contacts.length === 0 ? (
          <Text style={styles.emptyField}>Sin datos de contacto</Text>
        ) : (
          client.contacts.map((contact, index) => (
            <View key={index} style={[styles.contactCard, index > 0 && styles.contactCardBorder]}>
              {contact.name ? (
                <Text style={styles.contactName}>{contact.name}</Text>
              ) : null}
              {contact.phone ? (
                <Pressable
                  onPress={() => handleContactPhone(contact.phone!)}
                  accessibilityRole="link"
                  accessibilityLabel={`Contactar ${contact.phone}`}
                  hitSlop={{ top: 8, bottom: 8, left: 0, right: 8 }}
                >
                  <Text style={styles.contactLink}>{contact.phone}</Text>
                </Pressable>
              ) : null}
              {contact.email ? (
                <Pressable
                  onPress={() => handleContactEmail(contact.email!)}
                  accessibilityRole="link"
                  accessibilityLabel={`Enviar email a ${contact.email}`}
                  hitSlop={{ top: 8, bottom: 8, left: 0, right: 8 }}
                >
                  <Text style={styles.contactLink}>{contact.email}</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </View>

      <View style={styles.divider} />

      {/* ── Sección: Ubicación ───────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Ubicación" />
        <InfoRow label="Domicilio" value={client.address} />
        <InfoRow label="Localidad" value={client.city} />

        {hasMapTarget ? (
          <Pressable
            style={({ pressed }) => [
              styles.mapsButton,
              pressed && styles.mapsButtonPressed,
            ]}
            onPress={handleMaps}
            accessibilityRole="button"
            accessibilityLabel="Abrir ubicación en Google Maps"
          >
            <Text style={styles.mapsButtonText}>Abrir en Maps</Text>
          </Pressable>
        ) : null}

        {!client.address && !client.city ? (
          <Text style={styles.emptyField}>Sin dirección registrada</Text>
        ) : null}
      </View>

      <View style={styles.divider} />

      {/* ── Sección: Notas ───────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Notas" />
        {client.notes ? (
          <Text style={styles.notesText}>{client.notes}</Text>
        ) : (
          <Text style={styles.emptyField}>Sin notas</Text>
        )}
      </View>

      <View style={styles.divider} />

      {/* ── Sección: Historial de visitas ────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Historial de visitas" />

        {/* Nueva visita button */}
        <Pressable
          style={({ pressed }) => [
            styles.newVisitButton,
            pressed && styles.newVisitButtonPressed,
          ]}
          onPress={() => router.push(`/visits/form?clientId=${id}`)}
          accessibilityRole="button"
          accessibilityLabel="Agregar nueva visita"
        >
          <Text style={styles.newVisitButtonText}>Nueva visita</Text>
        </Pressable>

        {/* Visit list — up to 10 most recent (already sorted DESC by store) */}
        {visits.length === 0 ? (
          <Text style={styles.emptyField}>No hay visitas registradas</Text>
        ) : (
          visits.slice(0, 10).map((visit: VisitWithClient, index: number) => (
            <React.Fragment key={visit.id}>
              {index > 0 ? <View style={styles.visitDivider} /> : null}
              <Pressable
                style={({ pressed }) => [
                  styles.visitRow,
                  pressed && styles.visitRowPressed,
                ]}
                onPress={() => router.push(`/visits/${visit.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Ver visita del ${formatVisitDate(visit.scheduled_at)}`}
              >
                {/* Date + status */}
                <View style={styles.visitRowTop}>
                  <Text style={styles.visitDate}>
                    {formatVisitDate(visit.scheduled_at)}
                  </Text>
                  <StatusBadge status={visit.status} />
                </View>

                {/* Notes preview */}
                {visit.notes ? (
                  <Text style={styles.visitNotes} numberOfLines={1}>
                    {visit.notes.slice(0, 60)}
                  </Text>
                ) : null}
              </Pressable>
            </React.Fragment>
          ))
        )}
      </View>
    </ScrollView>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing[8],
  },

  // Header
  headerButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 48,
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.primary,
  },

  // Not found
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  notFoundText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },

  // Sections
  section: {
    padding: spacing[4],
    gap: spacing[3],
    backgroundColor: colors.surface,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  // Client name + badge
  clientName: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold as '700',
    color: colors.textPrimary,
    lineHeight: fontSize['2xl'] * 1.25,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
    color: colors.primary,
  },

  // Info rows
  infoRow: {
    gap: spacing[1],
  },
  infoLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular as '400',
    color: colors.textPrimary,
  },
  contactCard: {
    paddingVertical: spacing[2],
    gap: spacing[1],
  },
  contactCardBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing[2],
    paddingTop: spacing[3],
  },
  contactName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  contactLink: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: fontWeight.medium as '500',
  },

  // Maps button — secondary appearance per ui-specs
  mapsButton: {
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  mapsButtonPressed: {
    opacity: 0.75,
  },
  mapsButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.primary,
  },

  // Notes
  notesText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular as '400',
    color: colors.textPrimary,
    lineHeight: fontSize.base * 1.5,
  },

  // Shared
  emptyField: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
    fontStyle: 'italic',
  },

  // Visit history rows (min 56px per spec)
  newVisitButton: {
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newVisitButtonPressed: {
    opacity: 0.75,
  },
  newVisitButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.primary,
  },
  visitRow: {
    minHeight: 56,
    paddingVertical: spacing[3],
    gap: spacing[1],
    justifyContent: 'center',
  },
  visitRowPressed: {
    opacity: 0.7,
  },
  visitRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  visitDate: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular as '400',
    color: colors.textSecondary,
    flex: 1,
  },
  visitNotes: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular as '400',
    color: colors.textSecondary,
  },
  visitDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
})
