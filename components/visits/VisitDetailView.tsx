/**
 * components/visits/VisitDetailView.tsx — Visit detail shared view
 *
 * Shared component used by:
 *   - app/(tabs)/visits/[id].tsx       (Visits stack)
 *   - app/(tabs)/index/visits/[id].tsx  (Agenda stack)
 *
 * Reads `id` from route params via useLocalSearchParams.
 * Uses useNavigation to configure the header (Editar button).
 * Back button behavior is naturally correct in each stack.
 */

import React, { useEffect, useLayoutEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { useLocalSearchParams, useNavigation, usePathname, useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { StatusTypeBadge } from '@/components/ui/StatusTypeBadge'

import { useVisitsStore } from '@/stores/visitsStore'
import { useAuthStore } from '@/stores/authStore'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'
import dayjs from '@/lib/dayjs'

// ---------------------------------------------------------------------------
// Save indicator type
// ---------------------------------------------------------------------------

type SaveState = 'idle' | 'saving' | 'saved'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VisitDetailView() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const navigation = useNavigation()
  const pathname = usePathname()

  const currentUser = useAuthStore((s) => s.profile)
  const editFormPath = pathname.startsWith('/agenda')
    ? `/agenda/visits/form?visitId=${id}`
    : `/visits/form?visitId=${id}`

  const visit = useVisitsStore((state) => state.visits.find((v) => v.id === id))
  const error = useVisitsStore((state) => state.error)
  const deleting = useVisitsStore((state) => state.deleting)
  const deleteError = useVisitsStore((state) => state.deleteError)
  const fetchVisit = useVisitsStore((state) => state.fetchVisit)
  const updateVisit = useVisitsStore((state) => state.updateVisit)
  const updateStatus = useVisitsStore((state) => state.updateStatus)
  const deleteVisit = useVisitsStore((state) => state.deleteVisit)
  // Must be declared before any early return (Rules of Hooks).
  // Selector returns the stable array reference; filter runs outside
  // the subscription to avoid a new array on every render (infinite loop).
  const allVisits = useVisitsStore((s) => s.visits)
  const linkedSales = allVisits.filter((v) => v.quote_id === id)

  // If the visit isn't in the store yet (e.g. navigating from Today tab
  // before visitsStore has been populated), fetch it on demand.
  useEffect(() => {
    if (!visit && id) fetchVisit(id)
  }, [id])

  const [notesText, setNotesText] = useState<string>(visit?.notes ?? '')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [statusLoading, setStatusLoading] = useState(false)

  // Sync local notes when the store visit changes (e.g. after remote update)
  useEffect(() => {
    if (visit) {
      setNotesText(visit.notes ?? '')
    }
  }, [visit?.id])

  const isOwner = visit ? visit.owner_user_id === currentUser?.id : false

  // Set header: "Editar" button (only for visit owner)
  useLayoutEffect(() => {
    if (!visit) return
    navigation.setOptions({
      headerRight: isOwner
        ? () => (
            <Pressable
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onPress={() => router.push(editFormPath as any)}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Editar visita"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.headerButtonText}>Editar</Text>
            </Pressable>
          )
        : undefined,
    })
  }, [visit, id, navigation, router, isOwner])

  // -------------------------------------------------------------------------
  // Not found / loading
  // -------------------------------------------------------------------------

  if (!visit) {
    return (
      <View style={styles.notFoundContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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

    // Check if save was successful
    if (error) {
      setSaveState('idle')
      return
    }

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

  function handleDelete() {
    Alert.alert(
      'Eliminar gestión',
      '¿Estás seguro? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteVisit(id)
            if (!deleteError) {
              router.back()
            }
          },
        },
      ],
    )
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

  const rawDate = dayjs(visit.scheduled_at).format('dddd D [de] MMMM · HH:mm')
  const formattedDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1)

  // -------------------------------------------------------------------------
  // Root render
  // -------------------------------------------------------------------------

  return (
    <KeyboardAwareScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      extraScrollHeight={80}
    >

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

      {/* ── Sección: Estado y Tipo ─────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.statusTypeRow}>
          <View style={styles.statusTypeItem}>
            <SectionLabel title="Estado" />
            <StatusTypeBadge status={visit.status} type={visit.type} />
          </View>
          <View style={styles.statusTypeItem}>
            <SectionLabel title="Tipo" />
            <StatusTypeBadge type={visit.type} />
          </View>
        </View>
      </View>

      {/* ── Monto (solo cotizaciones y ventas con monto) ───────────────── */}
      {visit.amount != null && (visit.type === 'quote' || visit.type === 'sale') ? (
        <>
          <View style={styles.divider} />
          <View style={styles.section}>
            <SectionLabel title="Monto" />
            <Text style={styles.amountText}>
              ${visit.amount.toLocaleString('es-AR')} ARS
            </Text>
          </View>
        </>
      ) : null}

      {/* ── Cotización de origen (solo ventas con quote_id) ─────────────── */}
      {visit.quote_id ? (
        <>
          <View style={styles.divider} />
          <View style={styles.section}>
            <SectionLabel title="Cotización de origen" />
            <Pressable
              style={styles.linkedRow}
              onPress={() => router.push(`/visits/${visit.quote_id}` as never)}
              accessibilityRole="link"
              accessibilityLabel="Ver cotización de origen"
            >
              <Text style={styles.linkedRowText}>Ver cotización</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={colors.primary}
              />
            </Pressable>
          </View>
        </>
      ) : null}

      {/* ── Ventas generadas (solo cotizaciones con ventas vinculadas) ───── */}
      {visit.type === 'quote' && linkedSales.length > 0 ? (
        <>
          <View style={styles.divider} />
          <View style={styles.section}>
            <SectionLabel title="Ventas generadas" />
            {linkedSales.map((sale) => (
              <Pressable
                key={sale.id}
                style={styles.linkedRow}
                onPress={() => router.push(`/visits/${sale.id}` as never)}
                accessibilityRole="link"
                accessibilityLabel={`Ver venta del ${dayjs(sale.scheduled_at).format('DD/MM/YYYY')}`}
              >
                <View style={styles.linkedRowContent}>
                  <Text style={styles.linkedRowDate}>
                    {dayjs(sale.scheduled_at).format('DD/MM/YYYY')}
                  </Text>
                  {sale.amount != null ? (
                    <Text style={styles.linkedRowAmount}>
                      ${sale.amount.toLocaleString('es-AR')} ARS
                    </Text>
                  ) : null}
                  <StatusTypeBadge status={sale.status} type="sale" />
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

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

      {/* ── Sección: Acciones (solo si está pendiente y es propietario) ─── */}
      {visit.status === 'pending' && isOwner ? (
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

      {/* ── Eliminar gestión (solo propietario) ────────────────────────── */}
      {isOwner ? (
        <>
          <View style={styles.divider} />
          <View style={styles.section}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionButtonDelete,
                pressed && styles.actionButtonDeletePressed,
                deleting && styles.actionButtonDisabled,
              ]}
              onPress={handleDelete}
              disabled={deleting}
              accessibilityRole="button"
              accessibilityLabel="Eliminar gestión"
            >
              {deleting ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <Text style={styles.actionButtonDeleteText}>Eliminar gestión</Text>
              )}
            </Pressable>
          </View>
        </>
      ) : null}

    </KeyboardAwareScrollView>
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

  // Status + type row
  statusTypeRow: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  statusTypeItem: {
    gap: spacing[2],
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  typeBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textPrimary,
  },

  // Date
  dateText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium as '500',
    color: colors.textPrimary,
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

  // Amount
  amountText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },

  // Linked rows (quote origin / generated sales)
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: spacing[2],
  },
  linkedRowText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium as '500',
    color: colors.primary,
  },
  linkedRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flexWrap: 'wrap',
  },
  linkedRowDate: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium as '500',
    color: colors.textPrimary,
  },
  linkedRowAmount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
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
  actionButtonDelete: {
    backgroundColor: colors.transparent,
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  actionButtonDeletePressed: {
    opacity: 0.75,
  },
  actionButtonDeleteText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.error,
  },
})
