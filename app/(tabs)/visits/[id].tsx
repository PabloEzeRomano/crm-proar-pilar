/**
 * app/(tabs)/visits/[id].tsx — Visit detail
 *
 * Story 5.4 — EP-005
 *
 * Features:
 *   - Reads visit from store by id
 *   - Sections: Client, Fecha, Estado, Notas (auto-save on blur), Acciones
 *   - Notes auto-save with "Guardando..." / "Guardado" indicator
 *   - Status action buttons for pending visits (complete / cancel)
 *   - Header right: "Editar" → form modal
 */

import React, { useEffect, useLayoutEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { useVisitsStore } from '@/stores/visitsStore'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'
import { VisitStatus } from '@/types'
import dayjs from '@/lib/dayjs'

// ---------------------------------------------------------------------------
// StatusBadge (inline)
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    bg: colors.statusPendingLight,
    text: colors.statusPending,
    icon: 'clock-outline' as const,
  },
  completed: {
    label: 'Completada',
    bg: colors.statusCompletedLight,
    text: colors.statusCompleted,
    icon: 'check-circle-outline' as const,
  },
  canceled: {
    label: 'Cancelada',
    bg: colors.statusCanceledLight,
    text: colors.statusCanceled,
    icon: 'close-circle-outline' as const,
  },
} as const

function StatusBadge({ status }: { status: VisitStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <View style={[sbStyles.container, { backgroundColor: config.bg }]}>
      <MaterialCommunityIcons name={config.icon} size={14} color={config.text} />
      <Text style={[sbStyles.label, { color: config.text }]}>{config.label}</Text>
    </View>
  )
}

const sbStyles = StyleSheet.create({
  container: {
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.full,
    gap: spacing[1],
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
  },
})

// ---------------------------------------------------------------------------
// Save indicator type
// ---------------------------------------------------------------------------

type SaveState = 'idle' | 'saving' | 'saved'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const navigation = useNavigation()

  const visit = useVisitsStore((state) => state.visits.find((v) => v.id === id))
  const updateVisit = useVisitsStore((state) => state.updateVisit)
  const updateStatus = useVisitsStore((state) => state.updateStatus)

  const [notesText, setNotesText] = useState<string>(visit?.notes ?? '')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [statusLoading, setStatusLoading] = useState(false)

  // Sync local notes when the store visit changes (e.g. after remote update)
  useEffect(() => {
    if (visit) {
      setNotesText(visit.notes ?? '')
    }
  }, [visit?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Set "Editar" button in the header
  useLayoutEffect(() => {
    if (!visit) return
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => router.push(`/visits/form?visitId=${id}`)}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Editar visita"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.headerButtonText}>Editar</Text>
        </Pressable>
      ),
    })
  }, [visit, id, navigation, router])

  // -------------------------------------------------------------------------
  // Not found
  // -------------------------------------------------------------------------

  if (!visit) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Visita no encontrada</Text>
      </View>
    )
  }

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function handleNotesBlur() {
    const originalNotes = visit?.notes ?? ''
    if (notesText === originalNotes) return

    setSaveState('saving')
    await updateVisit(id, { notes: notesText })
    setSaveState('saved')

    // Reset indicator after 2 seconds
    setTimeout(() => setSaveState('idle'), 2000)
  }

  async function handleMarkCompleted() {
    if (statusLoading) return
    setStatusLoading(true)
    await updateStatus(id, 'completed')
    setStatusLoading(false)
  }

  async function handleCancelVisit() {
    if (statusLoading) return
    setStatusLoading(true)
    await updateStatus(id, 'canceled')
    setStatusLoading(false)
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function SectionLabel({ title }: { title: string }) {
    return <Text style={styles.sectionLabel}>{title}</Text>
  }

  const clientName = visit.client?.name ?? 'Cliente desconocido'
  const clientIndustry = visit.client?.industry ?? null
  const clientId = visit.client?.id ?? visit.client_id

  const formattedDate = dayjs(visit.scheduled_at).format('dddd D [de] MMMM · HH:mm')

  // -------------------------------------------------------------------------
  // Root render
  // -------------------------------------------------------------------------

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

      {/* ── Sección: Cliente ───────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionLabel title="Cliente" />
        <Text style={styles.clientName}>{clientName}</Text>

        {clientIndustry ? (
          <View style={styles.industryBadge}>
            <Text style={styles.industryBadgeText}>{clientIndustry}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => router.push(`/clients/${clientId}`)}
          accessibilityRole="link"
          accessibilityLabel={`Ver cliente ${clientName}`}
          hitSlop={{ top: 8, bottom: 8, left: 0, right: 8 }}
        >
          <Text style={styles.clientLink}>Ver cliente</Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      {/* ── Sección: Fecha ─────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionLabel title="Fecha" />
        <Text style={styles.dateText}>{formattedDate}</Text>
      </View>

      <View style={styles.divider} />

      {/* ── Sección: Estado ────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionLabel title="Estado" />
        <StatusBadge status={visit.status} />
      </View>

      <View style={styles.divider} />

      {/* ── Sección: Notas / Minuta ─────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.notesSectionHeader}>
          <SectionLabel title="Minuta" />
          {saveState === 'saving' ? (
            <Text style={styles.saveIndicator}>Guardando...</Text>
          ) : saveState === 'saved' ? (
            <Text style={[styles.saveIndicator, styles.saveIndicatorSaved]}>Guardado</Text>
          ) : null}
        </View>

        <TextInput
          style={styles.notesInput}
          value={notesText}
          onChangeText={setNotesText}
          onBlur={handleNotesBlur}
          placeholder="Añadir notas de la visita..."
          placeholderTextColor={colors.textDisabled}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          accessibilityLabel="Notas de la visita"
        />
      </View>

      {/* ── Sección: Acciones (solo si está pendiente) ──────────────────── */}
      {visit.status === 'pending' ? (
        <>
          <View style={styles.divider} />
          <View style={styles.section}>
            <SectionLabel title="Acciones" />

            {/* Marcar como completada */}
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionButtonSuccess,
                pressed && styles.actionButtonSuccessPressed,
                statusLoading && styles.actionButtonDisabled,
              ]}
              onPress={handleMarkCompleted}
              disabled={statusLoading}
              accessibilityRole="button"
              accessibilityLabel="Marcar visita como completada"
            >
              {statusLoading ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.actionButtonSuccessText}>
                  Marcar como completada
                </Text>
              )}
            </Pressable>

            {/* Cancelar visita */}
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionButtonDanger,
                pressed && styles.actionButtonDangerPressed,
                statusLoading && styles.actionButtonDisabled,
              ]}
              onPress={handleCancelVisit}
              disabled={statusLoading}
              accessibilityRole="button"
              accessibilityLabel="Cancelar visita"
            >
              {statusLoading ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <Text style={styles.actionButtonDangerText}>Cancelar visita</Text>
              )}
            </Pressable>
          </View>
        </>
      ) : null}

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
  sectionLabel: {
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

  // Client section
  clientName: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold as '700',
    color: colors.textPrimary,
    lineHeight: fontSize['2xl'] * 1.25,
  },
  industryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  industryBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
    color: colors.primary,
  },
  clientLink: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.primary,
  },

  // Date
  dateText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium as '500',
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },

  // Notes
  notesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveIndicator: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  saveIndicatorSaved: {
    color: colors.statusCompleted,
  },
  notesInput: {
    minHeight: 120,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: fontSize.base,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },

  // Action buttons
  actionButton: {
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  actionButtonSuccess: {
    backgroundColor: colors.success,
  },
  actionButtonSuccessPressed: {
    opacity: 0.85,
  },
  actionButtonSuccessText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textOnPrimary,
  },
  actionButtonDanger: {
    backgroundColor: colors.transparent,
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  actionButtonDangerPressed: {
    opacity: 0.75,
  },
  actionButtonDangerText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.error,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
})
