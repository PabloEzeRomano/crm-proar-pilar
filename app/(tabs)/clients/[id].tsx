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

import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import React, { useEffect, useLayoutEffect, useState } from 'react'
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
import AsyncStorage from '@react-native-async-storage/async-storage'

import { VisitRow } from '@/components/visits/VisitRow'

import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'
import { useVisits } from '@/hooks/useVisits'
import dayjs from '@/lib/dayjs'
import { useAuthStore } from '@/stores/authStore'
import { useClientsStore } from '@/stores/clientsStore'
import { useVisitsStore } from '@/stores/visitsStore'
import { useTodayStore } from '@/stores/todayStore'
import { VisitWithClient } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format Argentina phone number for WhatsApp with pre-filled greeting */
function formatArgentinaWhatsApp(phone: string, name: string): string {
  const digits = phone.replace(/\D/g, '')
  const normalized = digits.startsWith('54') ? digits : `54${digits}`
  const greeting = encodeURIComponent(`Hola ${name}!`)
  return `https://wa.me/${normalized}?text=${greeting}`
}

function handleContactPhone(phone: string, clientName?: string) {
  const whatsappLabel = clientName ? `Hola ${clientName}!` : 'WhatsApp'
  Alert.alert(phone, undefined, [
    { text: 'Llamar', onPress: () => Linking.openURL(`tel:${phone}`) },
    {
      text: 'WhatsApp',
      onPress: () => {
        const url = clientName
          ? formatArgentinaWhatsApp(phone, clientName)
          : `https://wa.me/${phone.replace(/\D/g, '')}`
        Linking.openURL(url)
      },
    },
    { text: 'Cancelar', style: 'cancel' },
  ])
}

function handleContactEmail(email: string) {
  Linking.openURL(`mailto:${email}`)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const navigation = useNavigation()

  const profile = useAuthStore((state) => state.profile)

  const client = useClientsStore((state) =>
    state.clients.find((c) => c.id === id),
  )
  const loading = useClientsStore((state) => state.loading)
  const fetchClient = useClientsStore((state) => state.fetchClient)
  const archiveClient = useClientsStore((state) => state.archiveClient)

  // Visits for this client — fetch directly by client_id to bypass global pagination
  const { visits, fetchVisitsByClient } = useVisits(id)

  useEffect(() => {
    if (id) fetchVisitsByClient(id)
  }, [id])

  // Fetch client if not in store
  useEffect(() => {
    if (id && !client) {
      fetchClient(id)
    }
  }, [id, client, fetchClient])

  const isOwner = client?.owner_user_id === profile?.id

  // Set "Editar" button in the header — only for the owner
  useLayoutEffect(() => {
    if (!client) return

    navigation.setOptions({
      headerRight: isOwner ? () => (
        <Pressable
          onPress={() => router.push(`/clients/form?clientId=${id}`)}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Editar cliente"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.headerButtonText}>Editar</Text>
        </Pressable>
      ) : undefined,
    })
  }, [client, id, isOwner, navigation, router])

  // "Visitar hoy" button state
  const [visitarHoyLoading, setVisitarHoyLoading] = useState(false)
  const createVisit = useVisitsStore((state) => state.createVisit)
  const todayVisits = useTodayStore((state) => state.visits)
  const fetchTodayVisits = useTodayStore((state) => state.fetchTodayVisits)

  // Find today's visit for this client (if it exists)
  const todayVisit = todayVisits.find(
    (v) =>
      v.client_id === id &&
      dayjs(v.scheduled_at).isSame(dayjs(), 'day'),
  )

  function handleArchiveClient() {
    Alert.alert(
      'Archivar cliente',
      '¿Archivar este cliente? Podrás verlo en la sección de inactivos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          style: 'destructive',
          onPress: async () => {
            await archiveClient(id)
            router.back()
          },
        },
      ],
    )
  }

  const handleVisitarHoy = async () => {
    if (!id) return

    setVisitarHoyLoading(true)
    try {
      // Read gap preference from AsyncStorage
      const gapStr = await AsyncStorage.getItem('visit-gap-minutes')
      const gap = gapStr ? Number(gapStr) : 60

      // Compute smart time: latest visit in today's list + gap, fallback to 10:00
      let smartTime = dayjs().hour(10).minute(0).second(0)
      const todayList = todayVisits.filter((v) =>
        dayjs(v.scheduled_at).isSame(dayjs(), 'day'),
      )
      if (todayList.length > 0) {
        const latest = todayList.reduce((a, b) =>
          a.scheduled_at > b.scheduled_at ? a : b,
        )
        smartTime = dayjs(latest.scheduled_at).add(gap, 'minute')
      }

      // Create visit
      const newVisit = await createVisit({
        client_id: id,
        scheduled_at: smartTime.toISOString(),
        status: 'pending',
        notes: undefined,
      })

      if (newVisit) {
        // Refresh today's visits and navigate
        await fetchTodayVisits()
        router.push(`/visits/${newVisit.id}`)
      } else {
        Alert.alert('Error', 'No se pudo crear la visita')
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al crear la visita')
    } finally {
      setVisitarHoyLoading(false)
    }
  }

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
                  onPress={() => handleContactPhone(contact.phone!, client.name)}
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

        {/* Visitar hoy / Ver visita de hoy + Nueva visita — owner only */}
        {isOwner && (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.newVisitButton,
                pressed && styles.newVisitButtonPressed,
              ]}
              onPress={todayVisit ? () => router.push(`/visits/${todayVisit.id}`) : handleVisitarHoy}
              disabled={visitarHoyLoading}
              accessibilityRole="button"
              accessibilityLabel={todayVisit ? 'Ver visita de hoy' : 'Visitar hoy'}
            >
              {visitarHoyLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.newVisitButtonText}>
                  {todayVisit ? 'Ver visita de hoy' : 'Visitar hoy'}
                </Text>
              )}
            </Pressable>

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
          </>
        )}

        {/* Visit list — up to 10 most recent (already sorted DESC by store) */}
        {visits.length === 0 ? (
          <Text style={styles.emptyField}>No hay visitas registradas</Text>
        ) : (
          <View style={styles.visitList}>
            {visits.slice(0, 10).map((visit: VisitWithClient) => (
              <VisitRow
                key={visit.id}
                visit={visit}
                onPress={() => router.push(`/visits/${visit.id}`)}
              />
            ))}
          </View>
        )}
      </View>

      {/* ── Archivar cliente — owner only ────────────────────────────────── */}
      {isOwner && (
        <>
          <View style={styles.divider} />
          <View style={styles.section}>
            <Pressable
              style={({ pressed }) => [
                styles.archiveButton,
                pressed && styles.archiveButtonPressed,
              ]}
              onPress={handleArchiveClient}
              accessibilityRole="button"
              accessibilityLabel="Archivar cliente"
            >
              <Text style={styles.archiveButtonText}>Archivar cliente</Text>
            </Pressable>
          </View>
        </>
      )}
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

  // Visit history
  visitList: {
    gap: spacing[2],
  },
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
  archiveButton: {
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.transparent,
  },
  archiveButtonPressed: {
    opacity: 0.7,
  },
  archiveButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textSecondary,
  },
})
