/**
 * app/(tabs)/visits/form.tsx — Create / Edit visit modal
 *
 * Story 5.5 — EP-005
 *
 * Features:
 *   - Reads visitId (edit mode) and/or clientId (pre-filled) from params
 *   - Client picker: read-only when pre-filled; inline searchable picker otherwise
 *   - Date + time pickers via @react-native-community/datetimepicker
 *     - iOS: inline pickers
 *     - Android: modal pickers (date then time)
 *   - Notes: optional multiline input
 *   - Save: createVisit or updateVisit, then dismiss modal
 *   - Header: Cancel (left) + Guardar (right, disabled when invalid)
 */

import React, { useEffect, useLayoutEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'

import DateTimeInput from '@/components/DateTimeInput'
import { useVisitsStore } from '@/stores/visitsStore'
import { useClientsStore } from '@/stores/clientsStore'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'
import { Client, VisitStatus } from '@/types'
import dayjs from '@/lib/dayjs'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GAP_KEY = 'visit-gap-minutes'
const DEFAULT_GAP = 60

const MINUTA_TEMPLATE = 'Objetivo:\n\nResultado:\n\nPróximos pasos:\n'

const GAP_OPTIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hora', value: 60 },
  { label: '1 h 30', value: 90 },
  { label: '2 horas', value: 120 },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Combine a date and a time value into a single ISO 8601 string */
function combineDateAndTime(date: Date, time: Date): string {
  return dayjs(date)
    .hour(dayjs(time).hour())
    .minute(dayjs(time).minute())
    .second(0)
    .toISOString()
}

/** Returns 'pending' if date >= today (date only), otherwise 'completed' */
function defaultStatusForDate(date: Date): 'pending' | 'completed' {
  const today = dayjs().startOf('day')
  return dayjs(date).isBefore(today) ? 'completed' : 'pending'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VisitFormScreen() {
  const { visitId, clientId: paramClientId } = useLocalSearchParams<{
    visitId?: string
    clientId?: string
  }>()
  const router = useRouter()
  const navigation = useNavigation()

  const isEditMode = Boolean(visitId)

  // Store access
  const visits = useVisitsStore((state) => state.visits)
  const createVisit = useVisitsStore((state) => state.createVisit)
  const updateVisit = useVisitsStore((state) => state.updateVisit)
  const error = useVisitsStore((state) => state.error)
  const clients = useClientsStore((state) => state.clients)
  const fetchClients = useClientsStore((state) => state.fetchClients)

  // Resolve existing visit in edit mode
  const existingVisit = visitId
    ? visits.find((v) => v.id === visitId) ?? null
    : null

  // -------------------------------------------------------------------------
  // Form state
  // -------------------------------------------------------------------------

  const defaultDate = dayjs().toDate()
  const defaultTime = dayjs().hour(10).minute(0).second(0).toDate()

  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate)
  const [selectedTime, setSelectedTime] = useState<Date>(defaultTime)
  const [notes, setNotes] = useState<string>(MINUTA_TEMPLATE)
  const [status, setStatus] = useState<VisitStatus>('pending')
  const [gapMinutes, setGapMinutes] = useState<number>(DEFAULT_GAP)

  // Date/time picker visibility (Android needs explicit show/hide)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  // Client picker search
  const [showClientPicker, setShowClientPicker] = useState(false)
  const [clientSearch, setClientSearch] = useState('')

  // Submission
  const [saving, setSaving] = useState(false)

  // -------------------------------------------------------------------------
  // Initialize from existing visit or param clientId
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (clients.length === 0) fetchClients()
    // Load saved gap preference and compute initial default time for create mode
    AsyncStorage.getItem(GAP_KEY).then((val) => {
      const gap = val ? Number(val) : DEFAULT_GAP
      setGapMinutes(gap)
      if (!isEditMode) {
        // Set status and time based on today
        setStatus(defaultStatusForDate(defaultDate))
        const today = dayjs().format('YYYY-MM-DD')
        const todayVisits = useVisitsStore.getState().visits.filter(
          (v) => dayjs(v.scheduled_at).format('YYYY-MM-DD') === today,
        )
        if (todayVisits.length > 0) {
          const latest = todayVisits.reduce((a, b) =>
            a.scheduled_at > b.scheduled_at ? a : b,
          )
          setSelectedTime(dayjs(latest.scheduled_at).add(gap, 'minute').toDate())
        }
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isEditMode && existingVisit) {
      const scheduledDate = new Date(existingVisit.scheduled_at)
      setSelectedDate(scheduledDate)
      setSelectedTime(scheduledDate)
      setNotes(existingVisit.notes ?? '')
      setStatus(existingVisit.status)

      const visitClient = clients.find((c) => c.id === existingVisit.client_id)
      if (visitClient) setSelectedClient(visitClient)
    } else if (paramClientId) {
      const preFilledClient = clients.find((c) => c.id === paramClientId)
      if (preFilledClient) setSelectedClient(preFilledClient)
    }
  }, [isEditMode, existingVisit?.id, paramClientId, clients]) // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  const isValid = isEditMode
    ? true // In edit mode, client is fixed; date always has a value
    : selectedClient !== null

  // -------------------------------------------------------------------------
  // Header buttons
  // -------------------------------------------------------------------------

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Editar visita' : 'Nueva visita',
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.headerButtonCancel}>Cancelar</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={handleSave}
          style={[styles.headerButton, !isValid && styles.headerButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Guardar visita"
          disabled={!isValid || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.headerButtonSave, !isValid && styles.headerButtonSaveDisabled]}>
              Guardar
            </Text>
          )}
        </Pressable>
      ),
    })
  }, [isValid, saving, selectedClient, selectedDate, selectedTime, notes, status, navigation]) // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function handleSave() {
    if (!isValid || saving) return

    setSaving(true)
    const isoString = combineDateAndTime(selectedDate, selectedTime)

    if (isEditMode && visitId) {
      await updateVisit(visitId, {
        scheduled_at: isoString,
        notes: notes || undefined,
        status,
      })
    } else {
      if (!selectedClient) {
        setSaving(false)
        return
      }
      await createVisit({
        client_id: selectedClient.id,
        scheduled_at: isoString,
        notes: notes || undefined,
        status,
      })
    }

    setSaving(false)
    
    // Only navigate back if save was successful
    if (!error) {
      router.back()
    }
  }

  function applyDateDefaults(date: Date) {
    // Auto-set status based on whether date is past or future (create mode only)
    if (!isEditMode) {
      setStatus(defaultStatusForDate(date))
    }
    // Default time: latest visit on that date + gap, else 10:00
    const dateKey = dayjs(date).format('YYYY-MM-DD')
    const visitsOnDate = visits.filter(
      (v) => dayjs(v.scheduled_at).format('YYYY-MM-DD') === dateKey,
    )
    if (visitsOnDate.length > 0) {
      const latest = visitsOnDate.reduce((a, b) =>
        a.scheduled_at > b.scheduled_at ? a : b,
      )
      setSelectedTime(dayjs(latest.scheduled_at).add(gapMinutes, 'minute').toDate())
    } else {
      setSelectedTime(dayjs().hour(10).minute(0).second(0).toDate())
    }
  }

  function handleDateChange(date: Date) {
    setSelectedDate(date)
    applyDateDefaults(date)
    if (Platform.OS === 'android') {
      // On Android, show time picker after date is selected
      setShowTimePicker(true)
    }
  }

  function handleTimeChange(time: Date) {
    setSelectedTime(time)
  }

  function handleDatePickerDismissAndroid() {
    setShowDatePicker(false)
  }

  function handleTimePickerDismissAndroid() {
    setShowTimePicker(false)
  }

  function handleClientSelect(client: Client) {
    setSelectedClient(client)
    setShowClientPicker(false)
    setClientSearch('')
  }

  // -------------------------------------------------------------------------
  // Filtered clients for picker
  // -------------------------------------------------------------------------

  const filteredClients = clientSearch.trim()
    ? clients.filter((c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()),
      )
    : clients

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function FieldLabel({ label, required }: { label: string; required?: boolean }) {
    return (
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.fieldRequired}> *</Text> : null}
      </Text>
    )
  }

  // -------------------------------------------------------------------------
  // Root render
  // -------------------------------------------------------------------------

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >

      {/* ── Cliente ─────────────────────────────────────────────────────── */}
      <View style={styles.fieldGroup}>
        <FieldLabel label="Cliente" required={!isEditMode} />

        {/* In edit mode or with pre-filled clientId: read-only */}
        {isEditMode || (paramClientId && selectedClient) ? (
          <View style={[styles.fieldDisplay, styles.fieldDisplayReadOnly]}>
            <Text style={styles.fieldDisplayText}>
              {selectedClient?.name ?? 'Cargando...'}
            </Text>
            <MaterialCommunityIcons
              name="lock-outline"
              size={16}
              color={colors.textSecondary}
            />
          </View>
        ) : selectedClient && !showClientPicker ? (
          /* Client selected: show name + allow re-selection */
          <Pressable
            style={({ pressed }) => [
              styles.fieldDisplay,
              pressed && styles.fieldDisplayPressed,
            ]}
            onPress={() => setShowClientPicker(true)}
            accessibilityRole="button"
            accessibilityLabel="Cambiar cliente seleccionado"
          >
            <Text style={styles.fieldDisplayText}>{selectedClient.name}</Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : !showClientPicker ? (
          /* No client selected: show selector button */
          <Pressable
            style={({ pressed }) => [
              styles.fieldDisplay,
              styles.fieldDisplayPlaceholder,
              pressed && styles.fieldDisplayPressed,
            ]}
            onPress={() => setShowClientPicker(true)}
            accessibilityRole="button"
            accessibilityLabel="Seleccionar cliente"
          >
            <Text style={styles.fieldDisplayPlaceholderText}>
              Seleccionar cliente
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : null}

        {/* Inline client picker */}
        {showClientPicker ? (
          <View style={styles.clientPickerContainer}>
            {/* Search input */}
            <View style={styles.clientSearchBar}>
              <MaterialCommunityIcons
                name="magnify"
                size={18}
                color={colors.textSecondary}
                style={styles.clientSearchIcon}
              />
              <TextInput
                style={styles.clientSearchInput}
                value={clientSearch}
                onChangeText={setClientSearch}
                placeholder="Buscar cliente..."
                placeholderTextColor={colors.textDisabled}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel="Buscar cliente"
              />
            </View>

            {/* Client list */}
            <FlatList
              data={filteredClients}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.clientPickerRow,
                    pressed && styles.clientPickerRowPressed,
                  ]}
                  onPress={() => handleClientSelect(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Seleccionar ${item.name}`}
                >
                  <Text style={styles.clientPickerRowName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.industry ? (
                    <Text style={styles.clientPickerRowSub} numberOfLines={1}>
                      {item.industry}
                    </Text>
                  ) : null}
                </Pressable>
              )}
              ItemSeparatorComponent={() => (
                <View style={styles.clientPickerDivider} />
              )}
              ListEmptyComponent={() => (
                <View style={styles.clientPickerEmpty}>
                  <Text style={styles.clientPickerEmptyText}>
                    No hay clientes
                  </Text>
                </View>
              )}
              scrollEnabled={false}
            />

            {/* Cancel picker */}
            <Pressable
              style={styles.clientPickerCancel}
              onPress={() => {
                setShowClientPicker(false)
                setClientSearch('')
              }}
              accessibilityRole="button"
              accessibilityLabel="Cancelar selección de cliente"
            >
              <Text style={styles.clientPickerCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* ── Fecha ────────────────────────────────────────────────────────── */}
      <View style={styles.fieldGroup}>
        <FieldLabel label="Fecha" />

        {Platform.OS === 'android' && !showDatePicker ? (
          <Pressable
            style={({ pressed }) => [
              styles.fieldDisplay,
              pressed && styles.fieldDisplayPressed,
            ]}
            onPress={() => setShowDatePicker(true)}
            accessibilityRole="button"
            accessibilityLabel="Seleccionar fecha"
          >
            <Text style={styles.fieldDisplayText}>
              {dayjs(selectedDate).format('DD/MM/YYYY')}
            </Text>
            <MaterialCommunityIcons
              name="calendar"
              size={20}
              color={colors.primary}
            />
          </Pressable>
        ) : (
          /* iOS and Web: inline date picker */
          <DateTimeInput
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'android' ? 'calendar' : 'inline'}
            onChange={handleDateChange}
            accentColor={colors.primary}
            locale="es"
            isAndroidModal={Platform.OS === 'android' && showDatePicker}
            onDismiss={handleDatePickerDismissAndroid}
            containerStyle={Platform.OS === 'ios' ? styles.iosDatePicker : undefined}
          />
        )}

        {/* Android date picker modal */}
        {Platform.OS === 'android' && showDatePicker ? (
          <DateTimeInput
            value={selectedDate}
            mode="date"
            display="calendar"
            onChange={handleDateChange}
            isAndroidModal={true}
            onDismiss={handleDatePickerDismissAndroid}
          />
        ) : null}
      </View>

      {/* ── Hora ─────────────────────────────────────────────────────────── */}
      <View style={styles.fieldGroup}>
        <FieldLabel label="Hora" />

        {Platform.OS === 'android' && !showTimePicker ? (
          <Pressable
            style={({ pressed }) => [
              styles.fieldDisplay,
              pressed && styles.fieldDisplayPressed,
            ]}
            onPress={() => setShowTimePicker(true)}
            accessibilityRole="button"
            accessibilityLabel="Seleccionar hora"
          >
            <Text style={styles.fieldDisplayText}>
              {dayjs(selectedTime).format('HH:mm')}
            </Text>
            <MaterialCommunityIcons
              name="clock-outline"
              size={20}
              color={colors.primary}
            />
          </Pressable>
        ) : (
          /* iOS and Web: inline time picker */
          <DateTimeInput
            value={selectedTime}
            mode="time"
            display={Platform.OS === 'android' ? 'clock' : 'spinner'}
            onChange={handleTimeChange}
            accentColor={colors.primary}
            locale="es"
            isAndroidModal={Platform.OS === 'android' && showTimePicker}
            onDismiss={handleTimePickerDismissAndroid}
            containerStyle={Platform.OS === 'ios' ? styles.iosTimePicker : undefined}
          />
        )}

        {/* Android time picker modal */}
        {Platform.OS === 'android' && showTimePicker ? (
          <DateTimeInput
            value={selectedTime}
            mode="time"
            display="clock"
            onChange={handleTimeChange}
            isAndroidModal={true}
            onDismiss={handleTimePickerDismissAndroid}
          />
        ) : null}
      </View>

      {/* ── Intervalo (create mode only) ─────────────────────────────────── */}
      {!isEditMode ? (
        <View style={styles.fieldGroup}>
          <FieldLabel label="Intervalo con visita anterior" />
          <View style={styles.gapRow}>
            {GAP_OPTIONS.map(({ label, value }) => {
              const active = gapMinutes === value
              return (
                <Pressable
                  key={value}
                  style={[styles.gapOption, active && styles.gapOptionActive]}
                  onPress={() => {
                    setGapMinutes(value)
                    AsyncStorage.setItem(GAP_KEY, String(value))
                    // Recompute time with new gap
                    applyDateDefaults(selectedDate)
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ checked: active }}
                >
                  <Text style={[styles.gapOptionLabel, active && styles.gapOptionLabelActive]}>
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      ) : null}

      {/* ── Estado ───────────────────────────────────────────────────────── */}
      <View style={styles.fieldGroup}>
          <FieldLabel label="Estado" />
          <View style={styles.statusRow}>
            {(
              [
                { value: 'pending', label: 'Pendiente', icon: 'clock-outline', color: colors.statusPending },
                { value: 'completed', label: 'Completada', icon: 'check-circle-outline', color: colors.statusCompleted },
                { value: 'canceled', label: 'Cancelada', icon: 'close-circle-outline', color: colors.statusCanceled },
              ] as { value: VisitStatus; label: string; icon: string; color: string }[]
            ).map(({ value, label, icon, color }) => {
              const active = status === value
              return (
                <Pressable
                  key={value}
                  style={[styles.statusOption, active && { borderColor: color, backgroundColor: color + '18' }]}
                  onPress={() => setStatus(value)}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ checked: active }}
                >
                  <MaterialCommunityIcons
                    name={icon as 'clock-outline'}
                    size={18}
                    color={active ? color : colors.textSecondary}
                  />
                  <Text style={[styles.statusOptionLabel, active && { color }]}>
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
      </View>

      {/* ── Notas ────────────────────────────────────────────────────────── */}
      <View style={styles.fieldGroup}>
        <FieldLabel label="Notas (opcional)" />
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Añadir notas..."
          placeholderTextColor={colors.textDisabled}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          accessibilityLabel="Notas de la visita"
        />
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
    paddingBottom: spacing[12],
  },

  // Header buttons
  headerButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 48,
    justifyContent: 'center',
  },
  headerButtonDisabled: {
    opacity: 0.4,
  },
  headerButtonCancel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium as '500',
    color: colors.primary,
  },
  headerButtonSave: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.primary,
  },
  headerButtonSaveDisabled: {
    color: colors.textDisabled,
  },

  // Field groups
  fieldGroup: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing[2],
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },
  fieldRequired: {
    color: colors.error,
  },

  // Field display (pressable read/select fields)
  fieldDisplay: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
  },
  fieldDisplayReadOnly: {
    opacity: 0.7,
  },
  fieldDisplayPressed: {
    borderColor: colors.primary,
  },
  fieldDisplayPlaceholder: {
    borderStyle: 'dashed',
  },
  fieldDisplayText: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    flex: 1,
  },
  fieldDisplayPlaceholderText: {
    fontSize: fontSize.base,
    color: colors.textDisabled,
    flex: 1,
  },

  // Client picker
  clientPickerContainer: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  clientSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surface,
  },
  clientSearchIcon: {
    marginRight: spacing[2],
  },
  clientSearchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    height: 48,
  },
  clientPickerRow: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 56,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  clientPickerRowPressed: {
    backgroundColor: colors.background,
  },
  clientPickerRowName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium as '500',
    color: colors.textPrimary,
  },
  clientPickerRowSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing[1],
  },
  clientPickerDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing[4],
  },
  clientPickerEmpty: {
    padding: spacing[4],
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  clientPickerEmptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  clientPickerCancel: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  clientPickerCancelText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },

  // Date/time pickers (iOS inline)
  iosDatePicker: {
    alignSelf: 'stretch',
    marginHorizontal: -spacing[1],
  },
  iosTimePicker: {
    height: 120,
    alignSelf: 'stretch',
  },

  // Gap picker
  gapRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  gapOption: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  gapOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  gapOptionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },
  gapOptionLabelActive: {
    color: colors.primary,
  },

  // Status picker
  statusRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  statusOptionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },

  // Notes
  notesInput: {
    minHeight: 96,
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
})
