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

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
// Nominatim types
// ---------------------------------------------------------------------------

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
  address: {
    road?: string
    house_number?: string
    city?: string
    town?: string
    village?: string
    suburb?: string
    county?: string
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formToInput(
  form: FormFields,
  contactList: ContactInfo[],
  coords?: { lat: number; lon: number } | null,
): CreateClientInput {
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
    latitude: coords?.lat ?? undefined,
    longitude: coords?.lon ?? undefined,
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

  // Address autocomplete
  const [showAddressSearch, setShowAddressSearch] = useState(false)
  const [addressQuery, setAddressQuery] = useState('')
  const [addressResults, setAddressResults] = useState<NominatimResult[]>([])
  const [addressSearching, setAddressSearching] = useState(false)
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lon: number } | null>(
    existingClient?.latitude && existingClient?.longitude
      ? { lat: existingClient.latitude, lon: existingClient.longitude }
      : null,
  )
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rubros = useLookupsStore((s) => s.rubros)
  const localidades = useLookupsStore((s) => s.localidades)
  const addLookup = useLookupsStore((s) => s.addLookup)

  const [addingRubro, setAddingRubro] = useState(false)
  const [addingLocalidad, setAddingLocalidad] = useState(false)
  const [newRubroText, setNewRubroText] = useState('')
  const [newLocalidadText, setNewLocalidadText] = useState('')
  const [addingLoading, setAddingLoading] = useState(false)

  const newRubroRef = useRef<TextInput>(null)
  const newLocalidadRef = useRef<TextInput>(null)

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
    const result = schema.safeParse(formToInput(form, contacts, addressCoords))
    if (!result.success) {
      setErrors(extractZodErrors(result.error))
      return false
    }
    setErrors({})
    return true
  }

  // -------------------------------------------------------------------------
  // Address autocomplete — Nominatim
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!showAddressSearch) return
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current)
    const q = addressQuery.trim()
    if (q.length < 3) {
      setAddressResults([])
      return
    }
    addressDebounceRef.current = setTimeout(async () => {
      setAddressSearching(true)
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5`
        const res = await fetch(url, {
          headers: { 'User-Agent': 'crm-proar-pilar' },
        })
        const json: NominatimResult[] = await res.json()
        setAddressResults(json)
      } catch {
        setAddressResults([])
      } finally {
        setAddressSearching(false)
      }
    }, 500)
  }, [addressQuery, showAddressSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleAddressSelect(result: NominatimResult) {
    const { road, house_number, city, town, village } = result.address
    const streetLine = [road, house_number].filter(Boolean).join(' ')
    const cityLine = city || town || village || ''
    setField('address', streetLine)
    setField('city', cityLine)
    setAddressCoords({ lat: parseFloat(result.lat), lon: parseFloat(result.lon) })
    setShowAddressSearch(false)
    setAddressQuery('')
    setAddressResults([])
  }

  // -------------------------------------------------------------------------
  // Inline add lookup helpers
  // -------------------------------------------------------------------------

  async function handleAddRubro() {
    if (!newRubroText.trim()) return
    setAddingLoading(true)
    const inserted = await addLookup('rubro', newRubroText)
    setAddingLoading(false)
    if (inserted) {
      setField('industry', inserted)
      setShowRubroPicker(false)
    }
    setAddingRubro(false)
    setNewRubroText('')
  }

  async function handleAddLocalidad() {
    if (!newLocalidadText.trim()) return
    setAddingLoading(true)
    const inserted = await addLookup('localidad', newLocalidadText)
    setAddingLoading(false)
    if (inserted) {
      setField('city', inserted)
      setShowLocalidadPicker(false)
    }
    setAddingLocalidad(false)
    setNewLocalidadText('')
  }

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    if (!validate()) return
    setSubmitError(null)

    const input = formToInput(form, contacts, addressCoords)

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

    router.dismiss()
  }, [form, contacts, addressCoords, isEditMode, clientId, createClient, updateClient, router]) // eslint-disable-line react-hooks/exhaustive-deps

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
          onPress={() => router.dismiss()}
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
              <ScrollView style={styles.pickerScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {form.industry ? (
                  <>
                    <Pressable
                      style={styles.pickerRow}
                      onPress={() => { setField('industry', ''); setShowRubroPicker(false) }}
                    >
                      <Text style={styles.pickerRowClear}>Sin rubro</Text>
                    </Pressable>
                    <View style={styles.pickerDivider} />
                  </>
                ) : null}
                {rubros.map((item, i) => (
                  <View key={item}>
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
                    {i < rubros.length - 1 && <View style={styles.pickerDivider} />}
                  </View>
                ))}
              </ScrollView>
              <View style={styles.pickerDivider} />
              {addingRubro ? (
                <View style={styles.pickerAddRow}>
                  <TextInput
                    ref={newRubroRef}
                    style={styles.pickerAddInput}
                    value={newRubroText}
                    onChangeText={setNewRubroText}
                    placeholder="Nuevo rubro…"
                    placeholderTextColor={colors.textDisabled}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleAddRubro}
                    autoFocus
                  />
                  <Pressable
                    style={[styles.pickerAddConfirm, (!newRubroText.trim() || addingLoading) && styles.pickerAddConfirmDisabled]}
                    onPress={handleAddRubro}
                    disabled={!newRubroText.trim() || addingLoading}
                  >
                    {addingLoading
                      ? <ActivityIndicator size="small" color={colors.background} />
                      : <MaterialCommunityIcons name="check" size={16} color={colors.background} />
                    }
                  </Pressable>
                  <Pressable
                    style={styles.pickerAddCancel}
                    onPress={() => { setAddingRubro(false); setNewRubroText('') }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="close" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.pickerRow, pressed && styles.pickerRowPressed]}
                  onPress={() => { setAddingRubro(true); setNewRubroText('') }}
                >
                  <MaterialCommunityIcons name="plus" size={16} color={colors.primary} style={styles.pickerAddIcon} />
                  <Text style={styles.pickerAddText}>Agregar nuevo…</Text>
                </Pressable>
              )}
            </View>
          )}
          {errors.industry ? (
            <Text style={styles.fieldError}>{errors.industry}</Text>
          ) : null}
        </View>

        {/* ── Domicilio ─────────────────────────────────────────────── */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.label}>Domicilio</Text>
          <View style={styles.addressRow}>
            <TextInput
              style={[getInputStyle('address'), styles.addressInput]}
              value={form.address}
              onChangeText={(text) => {
                setField('address', text)
                setAddressCoords(null) // reset coords when manually edited
              }}
              onFocus={() => setFocusedField('address')}
              onBlur={() => setFocusedField(null)}
              placeholder="Av. Ejemplo 1234"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <Pressable
              style={({ pressed }) => [
                styles.addressSearchBtn,
                pressed && styles.addressSearchBtnPressed,
              ]}
              onPress={() => {
                setAddressQuery(form.address)
                setShowAddressSearch(true)
              }}
              accessibilityRole="button"
              accessibilityLabel="Buscar dirección"
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <MaterialCommunityIcons name="magnify" size={22} color={colors.primary} />
            </Pressable>
          </View>
          {errors.address ? (
            <Text style={styles.fieldError}>{errors.address}</Text>
          ) : null}
        </View>

        {/* ── Address search modal ──────────────────────────────────── */}
        <Modal
          visible={showAddressSearch}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAddressSearch(false)}
        >
          <View style={styles.searchModal}>
            {/* Modal header */}
            <View style={styles.searchModalHeader}>
              <Text style={styles.searchModalTitle}>Buscar dirección</Text>
              <Pressable
                onPress={() => {
                  setShowAddressSearch(false)
                  setAddressQuery('')
                  setAddressResults([])
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Cerrar búsqueda"
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            {/* Search input */}
            <View style={styles.searchInputRow}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                value={addressQuery}
                onChangeText={setAddressQuery}
                placeholder="Buscar dirección…"
                placeholderTextColor={colors.textDisabled}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {addressSearching ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : null}
            </View>

            {/* Results */}
            <FlatList
              data={addressResults}
              keyExtractor={(item, index) => `${item.lat}-${item.lon}-${index}`}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.searchResultRow,
                    pressed && styles.searchResultRowPressed,
                  ]}
                  onPress={() => handleAddressSelect(item)}
                  accessibilityRole="button"
                  accessibilityLabel={item.display_name}
                >
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={18}
                    color={colors.textSecondary}
                    style={styles.searchResultIcon}
                  />
                  <Text style={styles.searchResultText} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.searchDivider} />}
              ListEmptyComponent={
                !addressSearching && addressQuery.trim().length >= 3
                  ? () => (
                      <View style={styles.searchEmpty}>
                        <Text style={styles.searchEmptyText}>Sin resultados</Text>
                      </View>
                    )
                  : null
              }
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.searchResultsList}
            />
          </View>
        </Modal>

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
              <ScrollView style={styles.pickerScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {form.city ? (
                  <>
                    <Pressable
                      style={styles.pickerRow}
                      onPress={() => { setField('city', ''); setShowLocalidadPicker(false) }}
                    >
                      <Text style={styles.pickerRowClear}>Sin localidad</Text>
                    </Pressable>
                    <View style={styles.pickerDivider} />
                  </>
                ) : null}
                {localidades.map((item, i) => (
                  <View key={item}>
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
                    {i < localidades.length - 1 && <View style={styles.pickerDivider} />}
                  </View>
                ))}
              </ScrollView>
              <View style={styles.pickerDivider} />
              {addingLocalidad ? (
                <View style={styles.pickerAddRow}>
                  <TextInput
                    ref={newLocalidadRef}
                    style={styles.pickerAddInput}
                    value={newLocalidadText}
                    onChangeText={setNewLocalidadText}
                    placeholder="Nueva localidad…"
                    placeholderTextColor={colors.textDisabled}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleAddLocalidad}
                    autoFocus
                  />
                  <Pressable
                    style={[styles.pickerAddConfirm, (!newLocalidadText.trim() || addingLoading) && styles.pickerAddConfirmDisabled]}
                    onPress={handleAddLocalidad}
                    disabled={!newLocalidadText.trim() || addingLoading}
                  >
                    {addingLoading
                      ? <ActivityIndicator size="small" color={colors.background} />
                      : <MaterialCommunityIcons name="check" size={16} color={colors.background} />
                    }
                  </Pressable>
                  <Pressable
                    style={styles.pickerAddCancel}
                    onPress={() => { setAddingLocalidad(false); setNewLocalidadText('') }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="close" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.pickerRow, pressed && styles.pickerRowPressed]}
                  onPress={() => { setAddingLocalidad(true); setNewLocalidadText('') }}
                >
                  <MaterialCommunityIcons name="plus" size={16} color={colors.primary} style={styles.pickerAddIcon} />
                  <Text style={styles.pickerAddText}>Agregar nueva…</Text>
                </Pressable>
              )}
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
  },
  pickerScroll: {
    maxHeight: 200,
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

  // Address search
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  addressInput: {
    flex: 1,
  },
  addressSearchBtn: {
    width: 48,
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressSearchBtnPressed: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  searchModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchModalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  searchResultsList: {
    paddingBottom: spacing[8],
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    minHeight: 56,
    backgroundColor: colors.surface,
  },
  searchResultRowPressed: {
    backgroundColor: colors.background,
  },
  searchResultIcon: {
    marginTop: 2,
    marginRight: spacing[2],
  },
  searchResultText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: fontSize.sm * 1.5,
  },
  searchDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing[4],
  },
  searchEmpty: {
    padding: spacing[6],
    alignItems: 'center',
  },
  searchEmptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // Inline "Agregar nuevo…" picker row
  pickerAddText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.primary,
    flex: 1,
  },
  pickerAddIcon: {
    marginRight: spacing[2],
  },
  pickerAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 48,
    gap: spacing[2],
  },
  pickerAddInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[2],
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  pickerAddConfirm: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerAddConfirmDisabled: {
    opacity: 0.4,
  },
  pickerAddCancel: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
