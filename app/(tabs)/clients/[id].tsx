/**
 * app/(tabs)/clients/[id].tsx — Client detail screen
 *
 * Story 4.4 — EP-004
 *
 * Features:
 *   - Reads client from store by id (no extra network call)
 *   - Sections: Información, Contacto, Ubicación, Notas, Historial de visitas
 *   - Phone / email open native links
 *   - "Abrir en Maps" opens Google Maps
 *   - Header right: "Editar" navigates to form modal
 */

import React, { useLayoutEffect } from 'react'
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'

import { useClientsStore } from '@/stores/clientsStore'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'

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
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Cliente no encontrado</Text>
      </View>
    )
  }

  // -------------------------------------------------------------------------
  // Link handlers
  // -------------------------------------------------------------------------

  function handlePhone() {
    if (!client?.phone) return
    Linking.openURL(`tel:${client.phone}`)
  }

  function handleEmail() {
    if (!client?.email) return
    Linking.openURL(`mailto:${client.email}`)
  }

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
        <InfoRow label="Nombre de contacto" value={client.contact_name} />

        {client.phone ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Teléfono</Text>
            <Pressable
              onPress={handlePhone}
              accessibilityRole="link"
              accessibilityLabel={`Llamar a ${client.phone}`}
              hitSlop={{ top: 8, bottom: 8, left: 0, right: 8 }}
            >
              <Text style={styles.infoLink}>{client.phone}</Text>
            </Pressable>
          </View>
        ) : null}

        {client.email ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Pressable
              onPress={handleEmail}
              accessibilityRole="link"
              accessibilityLabel={`Enviar email a ${client.email}`}
              hitSlop={{ top: 8, bottom: 8, left: 0, right: 8 }}
            >
              <Text style={styles.infoLink}>{client.email}</Text>
            </Pressable>
          </View>
        ) : null}

        {!client.contact_name && !client.phone && !client.email ? (
          <Text style={styles.emptyField}>Sin datos de contacto</Text>
        ) : null}
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

      {/* ── Sección: Historial de visitas (placeholder) ──────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Historial de visitas" />
        <Text style={styles.placeholderText}>Próximamente</Text>
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
  infoLink: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular as '400',
    color: colors.primary,
    textDecorationLine: 'underline',
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
  placeholderText: {
    fontSize: fontSize.base,
    color: colors.textDisabled,
    fontStyle: 'italic',
  },
})
