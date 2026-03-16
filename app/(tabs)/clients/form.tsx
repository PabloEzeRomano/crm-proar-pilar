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

import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { ZodError } from 'zod'

import { useClients } from '@/hooks/useClients'
import { useClientsStore } from '@/stores/clientsStore'
import { useLookupsStore } from '@/stores/lookupsStore'
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
import type { ContactInfo } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormFields = {
  name: string
  industry: string
  address: string
  city: string
  notes: string
}

type FieldErrors = Partial<Record<keyof FormFields, string>>

const EMPTY_FORM: FormFields = {
  name: '',
  industry: '',
  address: '',
  city: '',
  notes: '',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formToInput(form: FormFields, contactList: ContactInfo[]): CreateClientInput {
  return {
    name: form.name,
    industry: form.industry || undefined,
    address: form.address || undefined,
    city: form.city || undefined,
    notes: form.notes || undefined,
    contacts: contactList
      .map((c) => ({
        name: c.name?.trim() || undefined,
        phone: c.phone?.trim() || undefined,
        email: c.email?.trim() || undefined,
      }))
      .filter((c) => c.name || c.phone || c.email),
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
        notes: existingClient.notes ?? '',
      }
    }
    return EMPTY_FORM
  })

  const [contacts, setContacts] = useState<ContactInfo[]>(() =>
    existingClient?.contacts?.length ? existingClient.contacts : [{ name: '', phone: '', email: '' }],
  )

  const [errors, setErrors] = useState<FieldErrors>({})
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showRubroPicker, setShowRubroPicker] = useState(false)
  const [showLocalidadPicker, setShowLocalidadPicker] = useState(false)

  const rubros = useLookupsStore((s) => s.rubros)
  const localidades = useLookupsStore((s) => s.localidades)

  const { createClient, updateClient, loading } = useClients()

  // Sync contacts when existingClient loads asynchronously (edit mode)
  useEffect(() => {
    if (!isEditMode || !existingClient) return
    setForm({
      name: existingClient.name ?? '',
      industry: existingClient.industry ?? '',
      address: existingClient.address ?? '',
      city: existingClient.city ?? '',
      notes: existingClient.notes ?? '',
    })
    setContacts(
      existingClient.contacts?.length
        ? existingClient.contacts
        : [{ name: '', phone: '', email: '' }],
    )
  }, [isEditMode, existingClient])

  // -------------------------------------------------------------------------
  // Validate helper
  // -------------------------------------------------------------------------

  function validate(): boolean {
    const schema = isEditMode ? updateClientSchema : createClientSchema
    const result = schema.safeParse(formToInput(form, contacts))
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

    const input = formToInput(form, contacts)

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
  }, [form, contacts, isEditMode, clientId, createClient, updateClient, router]) // eslint-disable-line react-hooks/exhaustive-deps

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
  // Contact helpers
  // -------------------------------------------------------------------------

  function updateContact(index: number, field: keyof ContactInfo, value: string) {
    setContacts((prev) => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  function removeContact(index: number) {
    setContacts((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next.length > 0 ? next : [{ name: '', phone: '', email: '' }]
    })
  }

  function addContact() {
    setContacts((prev) => [...prev, { name: '', phone: '', email: '' }])
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
          <Pressable
            style={[styles.input, styles.selectField]}
            onPress={() => { setShowRubroPicker((v) => !v); setShowLocalidadPicker(false) }}
            accessibilityRole="button"
            accessibilityLabel="Seleccionar rubro"
          >
            <Text style={form.industry ? styles.selectText : styles.selectPlaceholder} numberOfLines={1}>
              {form.industry || 'Seleccionar rubro…'}
            </Text>
            <MaterialCommunityIcons
              name={showRubroPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
          {showRubroPicker && (
            <View style={styles.pickerList}>
              {form.industry ? (
                <Pressable
                  style={styles.pickerRow}
                  onPress={() => { setField('industry', ''); setShowRubroPicker(false) }}
                >
                  <Text style={styles.pickerRowClear}>Sin rubro</Text>
                </Pressable>
              ) : null}
              <FlatList
                data={rubros}
                keyExtractor={(item) => item}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [styles.pickerRow, pressed && styles.pickerRowPressed]}
                    onPress={() => { setField('industry', item); setShowRubroPicker(false) }}
                  >
                    <Text style={[styles.pickerRowText, form.industry === item && styles.pickerRowActive]}>
                      {item}
                    </Text>
                    {form.industry === item && (
                      <MaterialCommunityIcons name="check" size={16} color={colors.primary} />
                    )}
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={styles.pickerDivider} />}
              />
            </View>
          )}
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
          <Pressable
            style={[styles.input, styles.selectField]}
            onPress={() => { setShowLocalidadPicker((v) => !v); setShowRubroPicker(false) }}
            accessibilityRole="button"
            accessibilityLabel="Seleccionar localidad"
          >
            <Text style={form.city ? styles.selectText : styles.selectPlaceholder} numberOfLines={1}>
              {form.city || 'Seleccionar localidad…'}
            </Text>
            <MaterialCommunityIcons
              name={showLocalidadPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
          {showLocalidadPicker && (
            <View style={styles.pickerList}>
              {form.city ? (
                <Pressable
                  style={styles.pickerRow}
                  onPress={() => { setField('city', ''); setShowLocalidadPicker(false) }}
                >
                  <Text style={styles.pickerRowClear}>Sin localidad</Text>
                </Pressable>
              ) : null}
              <FlatList
                data={localidades}
                keyExtractor={(item) => item}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [styles.pickerRow, pressed && styles.pickerRowPressed]}
                    onPress={() => { setField('city', item); setShowLocalidadPicker(false) }}
                  >
                    <Text style={[styles.pickerRowText, form.city === item && styles.pickerRowActive]}>
                      {item}
                    </Text>
                    {form.city === item && (
                      <MaterialCommunityIcons name="check" size={16} color={colors.primary} />
                    )}
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={styles.pickerDivider} />}
              />
            </View>
          )}
          {errors.city ? (
            <Text style={styles.fieldError}>{errors.city}</Text>
          ) : null}
        </View>

        {/* ── Contactos ─────────────────────────────────────────────── */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.label}>Contactos</Text>

          {contacts.map((contact, index) => (
            <View key={index} style={styles.contactFormCard}>
              <View style={styles.contactFormCardHeader}>
                <Text style={styles.contactFormCardTitle}>
                  {contact.name?.trim() || `Contacto ${index + 1}`}
                </Text>
                {contacts.length > 1 ? (
                  <Pressable
                    onPress={() => removeContact(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Eliminar contacto"
                  >
                    <MaterialCommunityIcons name="close-circle" size={20} color={colors.textDisabled} />
                  </Pressable>
                ) : null}
              </View>

              <TextInput
                style={styles.contactFormInput}
                value={contact.name ?? ''}
                onChangeText={(text) => updateContact(index, 'name', text)}
                placeholder="Nombre"
                placeholderTextColor={colors.textDisabled}
                returnKeyType="next"
              />
              <TextInput
                style={styles.contactFormInput}
                value={contact.phone ?? ''}
                onChangeText={(text) => updateContact(index, 'phone', text)}
                placeholder="Teléfono"
                placeholderTextColor={colors.textDisabled}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
              <TextInput
                style={styles.contactFormInput}
                value={contact.email ?? ''}
                onChangeText={(text) => updateContact(index, 'email', text)}
                placeholder="Email"
                placeholderTextColor={colors.textDisabled}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
              />
            </View>
          ))}

          <Pressable onPress={addContact} style={styles.addContactButton}>
            <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
            <Text style={styles.addContactButtonText}>Agregar contacto</Text>
          </Pressable>
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

  // Select field (lookup picker trigger)
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 0,
  },
  selectText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  selectPlaceholder: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textDisabled,
  },

  // Inline dropdown list
  pickerList: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    maxHeight: 240,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    minHeight: 48,
    backgroundColor: colors.surface,
  },
  pickerRowPressed: {
    backgroundColor: colors.background,
  },
  pickerRowText: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    flex: 1,
  },
  pickerRowActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold as '600',
  },
  pickerRowClear: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  pickerDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing[3],
  },

  // Inline field error
  fieldError: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.regular as '400',
  },

  // Contact form cards
  contactFormCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[2],
    marginBottom: spacing[3],
    backgroundColor: colors.background,
  },
  contactFormCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactFormCardTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textSecondary,
  },
  contactFormInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[3],
    fontSize: fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    minHeight: 48,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    alignSelf: 'flex-start',
  },
  addContactButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.primary,
  },
})
