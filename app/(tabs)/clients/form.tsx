/**
 * app/(tabs)/clients/form.tsx — Create / Edit client modal
 *
 * Story 4.5 & 4.6 — EP-004
 *
 * - No clientId param → create mode ("Nuevo cliente")
 * - clientId param present → edit mode ("Editar cliente")
 * - Validates with createClientSchema / updateClientSchema from validators/client.ts
 * - All Supabase access goes through useClients hook (store)
 */

import React, { useCallback, useLayoutEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { ZodError } from 'zod'

import { useClients } from '@/hooks/useClients'
import { useClientsStore } from '@/stores/clientsStore'
import {
  createClientSchema,
  updateClientSchema,
  type CreateClientInput,
} from '@/validators/client'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormFields = {
  name: string
  industry: string
  address: string
  city: string
  contact_name: string
  phone: string
  email: string
  notes: string
}

type FieldErrors = Partial<Record<keyof FormFields, string>>

const EMPTY_FORM: FormFields = {
  name: '',
  industry: '',
  address: '',
  city: '',
  contact_name: '',
  phone: '',
  email: '',
  notes: '',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formToInput(form: FormFields): CreateClientInput {
  return {
    name: form.name,
    industry: form.industry || undefined,
    address: form.address || undefined,
    city: form.city || undefined,
    contact_name: form.contact_name || undefined,
    phone: form.phone || undefined,
    email: form.email || undefined,
    notes: form.notes || undefined,
  }
}

function extractZodErrors(err: ZodError): FieldErrors {
  const result: FieldErrors = {}
  for (const issue of err.issues) {
    const key = issue.path[0] as keyof FormFields | undefined
    if (key && !result[key]) {
      result[key] = issue.message
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientFormScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const { clientId } = useLocalSearchParams<{ clientId?: string }>()

  const isEditMode = Boolean(clientId)

  const existingClient = useClientsStore((state) =>
    clientId ? state.clients.find((c) => c.id === clientId) : undefined,
  )

  // Pre-fill form in edit mode
  const [form, setForm] = useState<FormFields>(() => {
    if (isEditMode && existingClient) {
      return {
        name: existingClient.name ?? '',
        industry: existingClient.industry ?? '',
        address: existingClient.address ?? '',
        city: existingClient.city ?? '',
        contact_name: existingClient.contact_name ?? '',
        phone: existingClient.phone ?? '',
        email: existingClient.email ?? '',
        notes: existingClient.notes ?? '',
      }
    }
    return EMPTY_FORM
  })

  const [errors, setErrors] = useState<FieldErrors>({})
  const [focusedField, setFocusedField] = useState<keyof FormFields | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { createClient, updateClient, loading } = useClients()

  // -------------------------------------------------------------------------
  // Validate helper
  // -------------------------------------------------------------------------

  function validate(): boolean {
    const schema = isEditMode ? updateClientSchema : createClientSchema
    const result = schema.safeParse(formToInput(form))
    if (!result.success) {
      setErrors(extractZodErrors(result.error))
      return false
    }
    setErrors({})
    return true
  }

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    if (!validate()) return
    setSubmitError(null)

    const input = formToInput(form)

    if (isEditMode && clientId) {
      await updateClient(clientId, input)
      const storeError = useClientsStore.getState().error
      if (storeError) {
        setSubmitError(storeError)
        return
      }
    } else {
      const created = await createClient(input)
      if (!created) {
        const storeError = useClientsStore.getState().error
        setSubmitError(storeError ?? 'Error al guardar el cliente')
        return
      }
    }

    router.back()
  }, [form, isEditMode, clientId, createClient, updateClient, router]) // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Is form valid for submit button state
  // -------------------------------------------------------------------------

  const isFormValid = form.name.trim().length > 0

  // -------------------------------------------------------------------------
  // Dynamic header — title + Cancelar / Guardar buttons
  // -------------------------------------------------------------------------

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Editar cliente' : 'Nuevo cliente',
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.headerCancelText}>Cancelar</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={handleSave}
          style={[
            styles.headerButton,
            (!isFormValid || loading) && styles.headerButtonDisabled,
          ]}
          disabled={!isFormValid || loading}
          accessibilityRole="button"
          accessibilityLabel="Guardar"
          accessibilityState={{ disabled: !isFormValid || loading }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.headerSaveText}>Guardar</Text>
          )}
        </Pressable>
      ),
    })
  }, [navigation, isEditMode, isFormValid, loading, handleSave, router])

  // -------------------------------------------------------------------------
  // Field helpers
  // -------------------------------------------------------------------------

  function setField(key: keyof FormFields, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Clear field error on change
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  function getInputStyle(key: keyof FormFields, multiline = false) {
    return [
      styles.input,
      multiline && styles.inputMultiline,
      focusedField === key && styles.inputFocused,
      errors[key] ? styles.inputError : null,
    ]
  }

  // -------------------------------------------------------------------------
  // Root render
  // -------------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Submit-level error banner */}
        {submitError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{submitError}</Text>
          </View>
        ) : null}

        {/* ── Nombre ────────────────────────────────────────────────── */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.label}>Nombre *</Text>
          <TextInput
            style={getInputStyle('name')}
            value={form.name}
            onChangeText={(text) => setField('name', text)}
            onFocus={() => setFocusedField('name')}
            onBlur={() => {
              setFocusedField(null)
              validate()
            }}
            placeholder="Nombre de la empresa"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="words"
            returnKeyType="next"
          />
          {errors.name ? (
            <Text style={styles.fieldError}>{errors.name}</Text>
          ) : null}
        </View>

        {/* ── Rubro ─────────────────────────────────────────────────── */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.label}>Rubro</Text>
          <TextInput
            style={getInputStyle('industry')}
            value={form.industry}
            onChangeText={(text) => setField('industry', text)}
            onFocus={() => setFocusedField('industry')}
            onBlur={() => setFocusedField(null)}
            placeholder="Ej: Construcción, Retail…"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="sentences"
            returnKeyType="next"
          />
          {errors.industry ? (
            <Text style={styles.fieldError}>{errors.industry}</Text>
          ) : null}
        </View>

        {/* ── Domicilio ─────────────────────────────────────────────── */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.label}>Domicilio</Text>
          <TextInput
            style={getInputStyle('address')}
            value={form.address}
            onChangeText={(text) => setField('address', text)}
            onFocus={() => setFocusedField('address')}
            onBlur={() => setFocusedField(null)}
            placeholder="Av. Ejemplo 1234"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="words"
            returnKeyType="next"
          />
          {errors.address ? (
            <Text style={styles.fieldError}>{errors.address}</Text>
          ) : null}
        </View>

        {/* ── Localidad ─────────────────────────────────────────────── */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.label}>Localidad</Text>
          <TextInput
            style={getInputStyle('city')}
            value={form.city}
            onChangeText={(text) => setField('city', text)}
            onFocus={() => setFocusedField('city')}
            onBlur={() => setFocusedField(null)}
            placeholder="Ciudad o localidad"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="words"
            returnKeyType="next"
          />
          {errors.city ? (
            <Text style={styles.fieldError}>{errors.city}</Text>
          ) : null}
        </View>

        {/* ── Contacto ──────────────────────────────────────────────── */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.label}>Contacto</Text>
          <TextInput
            style={getInputStyle('contact_name')}
            value={form.contact_name}
            onChangeText={(text) => setField('contact_name', text)}
            onFocus={() => setFocusedField('contact_name')}
            onBlur={() => setFocusedField(null)}
            placeholder="Nombre del contacto"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="words"
            returnKeyType="next"
          />
          {errors.contact_name ? (
            <Text style={styles.fieldError}>{errors.contact_name}</Text>
          ) : null}
        </View>

        {/* ── Teléfono ──────────────────────────────────────────────── */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={getInputStyle('phone')}
            value={form.phone}
            onChangeText={(text) => setField('phone', text)}
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField(null)}
            placeholder="+54 9 11 1234-5678"
            placeholderTextColor={colors.textDisabled}
            keyboardType="phone-pad"
            returnKeyType="next"
          />
          {errors.phone ? (
            <Text style={styles.fieldError}>{errors.phone}</Text>
          ) : null}
        </View>

        {/* ── Email ─────────────────────────────────────────────────── */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={getInputStyle('email')}
            value={form.email}
            onChangeText={(text) => setField('email', text)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => {
              setFocusedField(null)
              validate()
            }}
            placeholder="contacto@empresa.com"
            placeholderTextColor={colors.textDisabled}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
          />
          {errors.email ? (
            <Text style={styles.fieldError}>{errors.email}</Text>
          ) : null}
        </View>

        {/* ── Notas ─────────────────────────────────────────────────── */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.label}>Notas</Text>
          <TextInput
            style={getInputStyle('notes', true)}
            value={form.notes}
            onChangeText={(text) => setField('notes', text)}
            onFocus={() => setFocusedField('notes')}
            onBlur={() => setFocusedField(null)}
            placeholder="Información adicional sobre el cliente…"
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          {errors.notes ? (
            <Text style={styles.fieldError}>{errors.notes}</Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

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
    padding: spacing[4],
    gap: spacing[4],
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
  headerCancelText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular as '400',
    color: colors.textSecondary,
  },
  headerSaveText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.primary,
  },

  // Error banner (submit-level)
  errorBanner: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  errorBannerText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.medium as '500',
  },

  // Field wrapper
  fieldWrapper: {
    gap: spacing[1],
  },

  // Label — above the field
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },

  // Input — default state (single-line)
  input: {
    height: 48,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular as '400',
    color: colors.textPrimary,
  },

  // Multiline variant
  inputMultiline: {
    height: 100,
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
  },

  // Focused state
  inputFocused: {
    borderColor: colors.primary,
  },

  // Error state
  inputError: {
    borderColor: colors.error,
  },

  // Inline field error
  fieldError: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.regular as '400',
  },
})
