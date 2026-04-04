/**
 * app/(tabs)/settings.tsx — Settings screen
 *
 * Story 8.6 — EP-008
 * EP-019: Added rn-tourguide chapter "settings" (2 steps)
 *
 * Sections:
 *  1. Resumen semanal — toggle + sender email + recipients
 *  2. Cuenta — read-only user email + sign-out
 *  3. Aplicación — app name + version
 *
 * All data read/written through useAuthStore. No direct Supabase calls.
 */

import React, { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import TourStep from '@/components/tour/TourStep'

import { brand } from '@/constants/brand'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'
import type { EmailConfig } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { useClientsStore } from '@/stores/clientsStore'
import { useImportStore } from '@/stores/importStore'
import { useTodayStore } from '@/stores/todayStore'
import { useVisitsStore } from '@/stores/visitsStore'
import { useTourStore } from '@/stores/tourStore'

// ---------------------------------------------------------------------------
// Email validation schema
// ---------------------------------------------------------------------------

const emailSchema = z.string().email()

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SettingsScreenContent() {
  const insets = useSafeAreaInsets()

  const router = useRouter()

  const startTour = useTourStore((s) => s.startTour)
  const currentTourIndex = useTourStore((s) => s.currentIndex)

  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)
  const updateEmailConfig = useAuthStore((s) => s.updateEmailConfig)
  const resetTour = useAuthStore((s) => s.resetTour)

  const runImport = useImportStore((s) => s.runImport)
  const importing = useImportStore((s) => s.importing)
  const importResult = useImportStore((s) => s.result)
  const importError = useImportStore((s) => s.error)
  const clearImportResult = useImportStore((s) => s.clearResult)

  const fetchTodayVisits = useTodayStore((s) => s.fetchTodayVisits)
  const fetchVisits = useVisitsStore((s) => s.fetchVisits)

  // -------------------------------------------------------------------------
  // Local state
  // -------------------------------------------------------------------------

  const [localConfig, setLocalConfig] = useState<EmailConfig>(() => ({
    enabled: profile?.email_config?.enabled ?? false,
    sender: profile?.email_config?.sender ?? '',
    recipients: profile?.email_config?.recipients ?? [],
  }))
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addEmailError, setAddEmailError] = useState<string | null>(null)
  const [sendingReport, setSendingReport] = useState(false)
  const [reportFeedback, setReportFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [testingNotification, setTestingNotification] = useState(false)
  const [notificationFeedback, setNotificationFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  // Restart tour: persist DB flag, navigate to agenda
  function handleRestartTour() {
    resetTour()        // persist show_tour=true to DB
    startTour()        // currentIndex = 0
    router.replace('/(tabs)/agenda')
  }

  // Refresh agenda + visits stores after a successful import
  useEffect(() => {
    if (importResult) {
      fetchTodayVisits()
      fetchVisits()
    }
  }, [importResult]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync from store only when not dirty (profile may load after first render)
  useEffect(() => {
    if (!isDirty && profile?.email_config) {
      setLocalConfig({
        enabled: profile.email_config.enabled,
        sender: profile.email_config.sender ?? '',
        recipients: profile.email_config.recipients,
      })
    }
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  // Native-only: scroll the settings page to the active tour step section.
  // On web, TourStep handles scrollIntoView via the DOM — doing it here too
  // would race. On native there is no DOM, so we must scroll explicitly.
  const scrollRef = useRef<import('react-native').ScrollView>(null)
  const importSectionY = useRef(0)

  useEffect(() => {
    if (Platform.OS === 'web') return
    if (currentTourIndex === 8) {
      // Step 9 — email toggle is near the top; reset to top
      scrollRef.current?.scrollTo({ y: 0, animated: false })
    } else if (currentTourIndex === 9) {
      // Step 10 — import section; scroll to captured y offset
      scrollRef.current?.scrollTo({ y: importSectionY.current, animated: false })
    }
  }, [currentTourIndex])

  // Load notifications enabled setting from AsyncStorage on mount
  useEffect(() => {
    async function loadNotificationsEnabled() {
      try {
        const value = await AsyncStorage.getItem('notifications-enabled')
        // Default to true if not set
        setNotificationsEnabled(value !== 'false')
      } catch (error) {
        console.error('Failed to load notifications setting:', error)
        // Default to true on error
        setNotificationsEnabled(true)
      }
    }
    loadNotificationsEnabled()
  }, [])

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleToggle(val: boolean) {
    setLocalConfig((c) => ({ ...c, enabled: val }))
    setIsDirty(true)
  }

  async function handleNotificationsToggle(val: boolean) {
    setNotificationsEnabled(val)
    try {
      await AsyncStorage.setItem('notifications-enabled', val ? 'true' : 'false')
    } catch (error) {
      console.error('Failed to save notifications setting:', error)
    }
  }

  async function handleTestNotification() {
    // Only works on native platforms
    if (Platform.OS === 'web' || !Notifications.scheduleNotificationAsync) {
      setNotificationFeedback({ ok: false, message: 'No disponible en esta plataforma' })
      return
    }

    setTestingNotification(true)
    setNotificationFeedback(null)
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Prueba de notificación',
          body: 'Esta es una notificación de prueba para verificar que el sistema funciona.',
        } as any,
        trigger: { type: 'date', date: new Date(Date.now() + 500) }, // Show in 500ms
      } as any)
      setNotificationFeedback({ ok: true, message: `Notificación enviada (ID: ${notificationId.slice(0, 8)}...)` })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al enviar la notificación de prueba'
      setNotificationFeedback({ ok: false, message })
      console.error('Test notification error:', err)
    } finally {
      setTestingNotification(false)
    }
  }

  function handleSenderChange(text: string) {
    setLocalConfig((c) => ({ ...c, sender: text }))
    setIsDirty(true)
  }

  function handleAddRecipient() {
    const trimmed = addEmail.trim()
    const result = emailSchema.safeParse(trimmed)
    if (!result.success) {
      setAddEmailError('Email inválido')
      return
    }
    if (localConfig.recipients.includes(trimmed)) {
      setAddEmailError('Ya agregado')
      return
    }
    setLocalConfig((c) => ({ ...c, recipients: [...c.recipients, trimmed] }))
    setAddEmail('')
    setAddEmailError(null)
    setIsDirty(true)
  }

  function removeRecipient(email: string) {
    setLocalConfig((c) => ({
      ...c,
      recipients: c.recipients.filter((r) => r !== email),
    }))
    setIsDirty(true)
  }

  async function handleSave() {
    setSaving(true)

    // Validate sender email if provided
    if (localConfig.sender) {
      const result = emailSchema.safeParse(localConfig.sender)
      if (!result.success) {
        // Show error
        alert('Email remitente inválido')
        setSaving(false)
        return
      }
    }

    await updateEmailConfig({
      enabled: localConfig.enabled,
      sender: localConfig.sender || null,
      recipients: localConfig.recipients,
    })
    setSaving(false)
    setIsDirty(false)
  }

  async function handleSendReport() {
    setSendingReport(true)
    setReportFeedback(null)
    try {
      const invokeWeeklyEmail = useAuthStore((state) => state.invokeWeeklyEmail)
      await invokeWeeklyEmail()
      const error = useAuthStore((state) => state.error)
      if (error) {
        throw new Error(error)
      }
      setReportFeedback({ ok: true, message: 'Enviado correctamente' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al enviar el reporte'
      setReportFeedback({ ok: false, message })
    } finally {
      setSendingReport(false)
    }
  }

  async function handleDevReset() {
    Alert.alert(
      'Borrar todos los datos',
      'Esto eliminará TODOS los clientes y visitas del usuario. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: async () => {
            const deleteAllVisits = useVisitsStore((state) => state.deleteAllUserVisits)
            const deleteAllClients = useClientsStore((state) => state.deleteAllUserClients)
            await deleteAllVisits()
            await deleteAllClients()
            fetchVisits()
            fetchTodayVisits()
          },
        },
      ],
    )
  }

  function handleSignOut() {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que querés cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
      ],
    )
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const scrollPaddingBottom = spacing[16] + insets.bottom

  return (
    <View style={styles.flex}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollPaddingBottom },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ================================================================
            Section 1 — Resumen semanal
        ================================================================ */}
        <Text style={styles.sectionHeader}>RESUMEN SEMANAL</Text>

        <View style={styles.section}>
          {/* ── Tour step 9: Email toggle row ── */}
          <TourStep
            order={9}
            text="Activá el resumen semanal para recibir un email cada lunes con tus visitas de la semana. Configurá el destinatario y el email de respuesta."
            borderRadius={borderRadius.md}
            routePath="/(tabs)/settings"
          >
            <View style={[styles.row, styles.rowNoBorder]}>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Enviar resumen semanal</Text>
                <Text style={styles.rowSubtitle}>Cada lunes por la mañana</Text>
              </View>
              <Switch
                value={localConfig.enabled}
                onValueChange={handleToggle}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={
                  localConfig.enabled ? colors.primary : colors.textDisabled
                }
              />
            </View>
          </TourStep>

          {/* Send now button — dev only */}
          {__DEV__ && (
            <View style={[styles.row, styles.rowColumn, styles.rowBorderTop]}>
              <Pressable
                style={[styles.sendReportButton, sendingReport && styles.importButtonDisabled]}
                onPress={handleSendReport}
                disabled={sendingReport}
                accessibilityRole="button"
                accessibilityLabel="Enviar reporte ahora"
                accessibilityState={{ disabled: sendingReport, busy: sendingReport }}
              >
                {sendingReport ? (
                  <ActivityIndicator color={colors.textOnPrimary} size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="email-fast-outline" size={18} color={colors.textOnPrimary} />
                    <Text style={styles.importButtonLabel}>Enviar ahora</Text>
                  </>
                )}
              </Pressable>

              {reportFeedback && (
                <View style={[styles.importResult, !reportFeedback.ok && styles.importResultError]}>
                  <MaterialCommunityIcons
                    name={reportFeedback.ok ? 'check-circle' : 'alert-circle'}
                    size={16}
                    color={reportFeedback.ok ? colors.success : colors.error}
                  />
                  <Text style={[styles.importResultText, !reportFeedback.ok && styles.importResultErrorText]}>
                    {reportFeedback.message}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Expanded config when enabled */}
          {localConfig.enabled && (
            <>
              {/* Sender address (read-only, auto-generated from auth email) */}
              <View style={[styles.row, styles.rowColumn, styles.rowBorderTop]}>
                <Text style={styles.label}>Email de envío</Text>
                <Text style={styles.rowSubtitle}>
                  Se generó automáticamente desde tu email de inicio de sesión
                </Text>
                <View style={[styles.input, styles.inputReadOnly]}>
                  <Text style={styles.inputReadOnlyText}>
                    {profile?.email_config?.sender_name && profile?.email_config?.sender_address
                      ? `${profile.email_config.sender_name} <${profile.email_config.sender_address}>`
                      : '—'}
                  </Text>
                </View>
              </View>

              {/* Reply-To email input */}
              <View style={[styles.row, styles.rowColumn, styles.rowBorderTop]}>
                <Text style={styles.label}>Tu email (para respuestas)</Text>
                <Text style={styles.rowSubtitle}>
                  Las respuestas al reporte llegarán a este email
                </Text>
                <TextInput
                  style={styles.input}
                  value={localConfig.sender ?? ''}
                  onChangeText={handleSenderChange}
                  placeholder="vos@empresa.com"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              {/* Recipients */}
              <View style={[styles.row, styles.rowColumn, styles.rowBorderTop]}>
                <Text style={styles.label}>Destinatarios</Text>

                {/* Chips */}
                {localConfig.recipients.length > 0 && (
                  <View style={styles.chipsContainer}>
                    {localConfig.recipients.map((email) => (
                      <View key={email} style={styles.chip}>
                        <Text
                          style={styles.chipText}
                          numberOfLines={1}
                        >
                          {email}
                        </Text>
                        <Pressable
                          onPress={() => removeRecipient(email)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel={`Eliminar ${email}`}
                        >
                          <MaterialCommunityIcons
                            name="close"
                            size={16}
                            color={colors.textSecondary}
                          />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                {/* Add recipient row */}
                <View style={styles.addRow}>
                  <TextInput
                    style={[styles.input, styles.addInput]}
                    value={addEmail}
                    onChangeText={(text) => {
                      setAddEmail(text)
                      if (addEmailError) setAddEmailError(null)
                    }}
                    placeholder="correo@ejemplo.com"
                    placeholderTextColor={colors.textDisabled}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    returnKeyType="done"
                    onSubmitEditing={handleAddRecipient}
                  />
                  <Pressable
                    style={styles.addButton}
                    onPress={handleAddRecipient}
                    accessibilityRole="button"
                    accessibilityLabel="Agregar destinatario"
                  >
                    <Text style={styles.addButtonLabel}>Agregar</Text>
                  </Pressable>
                </View>

                {addEmailError && (
                  <Text style={styles.fieldError}>{addEmailError}</Text>
                )}
              </View>
            </>
          )}
        </View>

        {/* ================================================================
            Section 2 — Notificaciones
        ================================================================ */}
        <Text style={styles.sectionHeader}>NOTIFICACIONES</Text>

        <View style={styles.section}>
          <View style={[styles.row, styles.rowNoBorder]}>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Recordatorios de visitas</Text>
              <Text style={styles.rowSubtitle}>Recibir notificaciones antes de las visitas</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={
                notificationsEnabled ? colors.primary : colors.textDisabled
              }
            />
          </View>

          {/* Test notification button — dev only */}
          {__DEV__ && (
            <View style={[styles.row, styles.rowColumn, styles.rowBorderTop]}>
              <Pressable
                style={[styles.sendReportButton, testingNotification && styles.importButtonDisabled]}
                onPress={handleTestNotification}
                disabled={testingNotification}
                accessibilityRole="button"
                accessibilityLabel="Enviar notificación de prueba"
                accessibilityState={{ disabled: testingNotification, busy: testingNotification }}
              >
                {testingNotification ? (
                  <ActivityIndicator color={colors.textOnPrimary} size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="bell-ring-outline" size={18} color={colors.textOnPrimary} />
                    <Text style={styles.importButtonLabel}>Prueba de notificación</Text>
                  </>
                )}
              </Pressable>

              {notificationFeedback && (
                <View style={[styles.importResult, !notificationFeedback.ok && styles.importResultError]}>
                  <MaterialCommunityIcons
                    name={notificationFeedback.ok ? 'check-circle' : 'alert-circle'}
                    size={16}
                    color={notificationFeedback.ok ? colors.success : colors.error}
                  />
                  <Text style={[styles.importResultText, !notificationFeedback.ok && styles.importResultErrorText]}>
                    {notificationFeedback.message}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ================================================================
            Section 3 — Importar datos
        ================================================================ */}
        <Text
          style={styles.sectionHeader}
          onLayout={(e) => { importSectionY.current = e.nativeEvent.layout.y }}
        >IMPORTAR DATOS</Text>

        <View style={styles.section}>
          {/* ── Tour step 10: Import button ── */}
          <TourStep
            order={10}
            text="Importá todos tus clientes y visitas desde un archivo Excel (.xlsx). El sistema elimina clientes duplicados y crea las visitas automáticamente."
            borderRadius={borderRadius.md}
            routePath="/(tabs)/settings"
          >
            <View style={[styles.row, styles.rowColumn, styles.rowNoBorder]}>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Importar desde Excel</Text>
                <Text style={styles.rowSubtitle}>
                  Seleccioná el archivo .xlsx para importar clientes y visitas
                </Text>
              </View>

              <Pressable
                style={[styles.importButton, importing && styles.importButtonDisabled]}
                onPress={() => {
                  clearImportResult()
                  runImport()
                }}
                disabled={importing}
                accessibilityRole="button"
                accessibilityLabel="Seleccionar archivo Excel"
                accessibilityState={{ disabled: importing, busy: importing }}
              >
                {importing ? (
                  <ActivityIndicator color={colors.textOnPrimary} size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="file-excel"
                      size={18}
                      color={colors.textOnPrimary}
                    />
                    <Text style={styles.importButtonLabel}>Seleccionar archivo</Text>
                  </>
                )}
              </Pressable>

            {/* Result banner */}
            {importResult && (
              <View style={styles.importResult}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={16}
                  color={colors.success}
                />
                <Text style={styles.importResultText}>
                  {importResult.clientsCreated} clientes nuevos · {importResult.visitsCreated} visitas nuevas
                  {importResult.clientsSkipped + importResult.visitsSkipped > 0
                    ? ` · ${importResult.clientsSkipped + importResult.visitsSkipped} ya existían`
                    : ''}
                  {importResult.errors > 0
                    ? ` · ${importResult.errors} errores`
                    : ''}
                </Text>
              </View>
            )}

            {/* Error banner */}
            {importError && (
              <View style={[styles.importResult, styles.importResultError]}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={16}
                  color={colors.error}
                />
                <Text style={[styles.importResultText, styles.importResultErrorText]}>
                  {importError}
                </Text>
              </View>
            )}
            </View>
          </TourStep>
        </View>

        {/* ================================================================
            Section 3 — Cuenta
        ================================================================ */}
        <Text style={styles.sectionHeader}>CUENTA</Text>

        <View style={styles.section}>
          {/* User email (read-only) */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
          </View>

          {/* Ver tour de nuevo */}
          <View style={[styles.row, styles.rowBorderTop]}>
            <Pressable
              style={styles.rowContent}
              onPress={handleRestartTour}
              accessibilityRole="button"
              accessibilityLabel="Ver tour de nuevo"
            >
              <Text style={styles.rowLabel}>Ver tour de nuevo</Text>
              <Text style={styles.rowSubtitle}>Reinicia el tutorial de bienvenida</Text>
            </Pressable>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textDisabled} />
          </View>

          {/* Sign out button */}
          <View style={[styles.row, styles.rowSignOut, styles.rowBorderTop]}>
            <Pressable
              style={styles.signOutButton}
              onPress={handleSignOut}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
            >
              <Text style={styles.signOutButtonLabel}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </View>

        {/* ================================================================
            Section DEV — only visible in development builds
        ================================================================ */}
        {__DEV__ && (
          <>
            <Text style={styles.sectionHeader}>DESARROLLO</Text>
            <View style={styles.section}>
              <View style={styles.rowNoBorder}>
                <Pressable
                  style={styles.devResetButton}
                  onPress={handleDevReset}
                  accessibilityRole="button"
                  accessibilityLabel="Borrar todos los clientes y visitas"
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
                  <Text style={styles.devResetButtonText}>Borrar clientes y visitas</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}

        {/* ================================================================
            Section 3 — Aplicación
        ================================================================ */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>{brand.appName}</Text>
          <Text style={styles.appInfoText}>Versión {Constants.expoConfig?.version || 'desconocida'}</Text>
        </View>
      </ScrollView>

      {/* ================================================================
          Floating save bar — visible only when there are unsaved changes
      ================================================================ */}
      {isDirty && (
        <View
          style={[
            styles.saveBar,
            { paddingBottom: spacing[4] + insets.bottom },
          ]}
        >
          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
            accessibilityState={{ disabled: saving, busy: saving }}
          >
            {saving ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.saveButtonLabel}>Guardar cambios</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  )
}

export default SettingsScreenContent

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing[4],
  },

  // ── Section header ────────────────────────────────────────────────────────

  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
  },

  // ── Section container ─────────────────────────────────────────────────────

  section: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing[4],
  },

  // ── Row base ──────────────────────────────────────────────────────────────

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // Row with no bottom border (last row variant)
  rowNoBorder: {
    borderBottomWidth: 0,
  },

  // Row with explicit top border (used when rendered after toggle)
  rowBorderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // Column-direction row variant (for labelled inputs)
  rowColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing[2],
  },

  // Sign out row — no bottom border since it's the last item
  rowSignOut: {
    borderBottomWidth: 0,
  },

  // ── Row content ───────────────────────────────────────────────────────────

  rowContent: {
    flex: 1,
    gap: spacing[1],
  },
  rowLabel: {
    marginRight: spacing[1],
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular as '400',
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular as '400',
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular as '400',
    color: colors.textSecondary,
    flexShrink: 1,
    textAlign: 'right',
  },

  // ── Input ─────────────────────────────────────────────────────────────────

  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },
  input: {
    height: 48,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular as '400',
    color: colors.textPrimary,
  },
  inputReadOnly: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  inputReadOnlyText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular as '400',
    color: colors.textSecondary,
  },

  // ── Recipients chips ──────────────────────────────────────────────────────

  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular as '400',
    color: colors.textPrimary,
    flexShrink: 1,
    maxWidth: 200,
  },

  // ── Add recipient row ─────────────────────────────────────────────────────

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  addInput: {
    flex: 1,
  },
  addButton: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textOnPrimary,
  },
  fieldError: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular as '400',
    color: colors.error,
  },

  // ── Send report button ────────────────────────────────────────────────────

  sendReportButton: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },

  // ── Import button ─────────────────────────────────────────────────────────

  importButton: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textOnPrimary,
  },
  importResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  importResultError: {
    backgroundColor: colors.errorLight,
  },
  importResultText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular as '400',
    color: colors.success,
  },
  importResultErrorText: {
    color: colors.error,
  },

  // ── Sign out button ───────────────────────────────────────────────────────

  signOutButton: {
    flex: 1,
    height: 52,
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutButtonLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.white,
  },

  // ── App info ──────────────────────────────────────────────────────────────

  appInfo: {
    alignItems: 'center',
    marginTop: spacing[8],
    gap: spacing[1],
  },
  appInfoText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular as '400',
    color: colors.textDisabled,
  },

  // ── Dev section ───────────────────────────────────────────────────────────

  devResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
  },
  devResetButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium as '500',
    color: colors.error,
  },

  // ── Floating save bar ─────────────────────────────────────────────────────

  saveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  saveButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textOnPrimary,
  },
})
