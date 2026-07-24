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

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppDatePicker from '@/components/ui/AppDatePicker';
import { showAlert } from '@/lib/dialog';
import { StatusTypeBadge } from '@/components/ui/StatusTypeBadge';
import QuoteItemRow from '@/components/visits/QuoteItemRow';
import { useVisitsStore } from '@/stores/visitsStore';
import { useClientsStore } from '@/stores/clientsStore';
import { useProductsStore } from '@/stores/productsStore';
import { useAuthStore } from '@/stores/authStore';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
  visitTypeColors,
} from '@/constants/theme';
import {
  Client,
  ContactInfo,
  Product,
  ProductPresentation,
  QuoteItem,
  VisitStatus,
  VisitType,
} from '@/types';
import dayjs from '@/lib/dayjs';
import { getStatusLabel } from '@/lib/visitStatus';
import {
  PRODUCT_FILTER_OPTIONS,
  ProductFilterType,
  VISIT_TYPE_OPTIONS_WITH_ICONS,
} from '@/constants/visitOptions';
import { GAP_KEY } from '@/constants/agendaSettings';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_GAP = 60;

const MINUTA_TEMPLATE = '';


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Combine a date and a time value into a single ISO 8601 string */
function combineDateAndTime(date: Date, time: Date): string {
  return dayjs(date)
    .hour(dayjs(time).hour())
    .minute(dayjs(time).minute())
    .second(0)
    .toISOString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VisitFormScreen() {
  const {
    visitId,
    clientId: paramClientId,
    threadId: paramThreadId,
    prefillTitle: paramPrefillTitle,
    prefillNotes: paramPrefillNotes,
  } = useLocalSearchParams<{
    visitId?: string;
    clientId?: string;
    threadId?: string;
    prefillTitle?: string;
    prefillNotes?: string;
  }>();
  const router = useRouter();
  const navigation = useNavigation();

  const closeForm = useCallback(() => {
    if (router.canDismiss()) {
      router.dismiss();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace('/(tabs)/visits');
    }
  }, [navigation, router]);

  const isEditMode = Boolean(visitId);

  // Store access
  const visits = useVisitsStore((state) => state.visits);
  const createVisit = useVisitsStore((state) => state.createVisit);
  const updateVisit = useVisitsStore((state) => state.updateVisit);
  const error = useVisitsStore((state) => state.error);
  const clients = useClientsStore((state) => state.clients);
  const fetchClients = useClientsStore((state) => state.fetchClients);
  const fetchVisitsByClient = useVisitsStore((state) => state.fetchVisitsByClient);

  // Resolve existing visit in edit mode
  const existingVisit = visitId
    ? (visits.find((v) => v.id === visitId) ?? null)
    : null;

  // -------------------------------------------------------------------------
  // Form state
  // -------------------------------------------------------------------------

  const defaultDate = dayjs().toDate();
  const defaultTime = dayjs().hour(10).minute(0).second(0).toDate();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate);
  const [selectedTime, setSelectedTime] = useState<Date>(defaultTime);
  const [title, setTitle] = useState<string>('');
  const [selectedContact, setSelectedContact] = useState<ContactInfo | null>(
    null
  );
  const [notes, setNotes] = useState<string>(MINUTA_TEMPLATE);
  const [status, setStatus] = useState<VisitStatus>('pending');
  const [visitType, setVisitType] = useState<VisitType>('customer_service');
  const [gapMinutes, setGapMinutes] = useState<number>(DEFAULT_GAP);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const clientQuotes = useVisitsStore((s) => s.clientQuotes);
  const fetchQuotesByClient = useVisitsStore((s) => s.fetchQuotesByClient);
  const clearClientQuotes = useVisitsStore((s) => s.clearClientQuotes);

  // Product line items (quote/sale only)
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productTypeFilter, setProductTypeFilter] =
    useState<ProductFilterType>('all');
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(
    new Set()
  );
  const products = useProductsStore((s) => s.products);
  const fetchClientProducts = useProductsStore((s) => s.fetchClientProducts);
  const syncClientProducts = useProductsStore((s) => s.syncClientProducts);

  const sendQuote = useAuthStore((s) => s.sendQuote);

  // Recipient email for quote send
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingQuote, setSendingQuote] = useState(false);

  // Date/time picker visibility (Android needs explicit show/hide)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Client picker search
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  // Thread
  const [createAsThread, setCreateAsThread] = useState(false);

  // Submission
  const [saving, setSaving] = useState(false);

  // -------------------------------------------------------------------------
  // Initialize from existing visit or param clientId
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (clients.length === 0) fetchClients();
    // Load saved gap preference and compute initial default time for create mode
    AsyncStorage.getItem(GAP_KEY).then((val) => {
      const gap = val ? Number(val) : DEFAULT_GAP;
      setGapMinutes(gap);
      if (!isEditMode) {
        // New visits always start as pending
        const today = dayjs().format('YYYY-MM-DD');
        const todayVisits = useVisitsStore
          .getState()
          .visits.filter(
            (v) => dayjs(v.scheduled_at).format('YYYY-MM-DD') === today
          );
        if (todayVisits.length > 0) {
          const latest = todayVisits.reduce((a, b) =>
            a.scheduled_at > b.scheduled_at ? a : b
          );
          setSelectedTime(
            dayjs(latest.scheduled_at).add(gap, 'minute').toDate()
          );
        }
      }
    });
  }, []);

  useEffect(() => {
    if (isEditMode && existingVisit) {
      const scheduledDate = new Date(existingVisit.scheduled_at);
      setSelectedDate(scheduledDate);
      setSelectedTime(scheduledDate);
      setTitle(existingVisit.title ?? '');
      setSelectedContact(existingVisit.contact_snapshot ?? null);
      setNotes(existingVisit.notes ?? '');
      setStatus(existingVisit.status);
      setVisitType(existingVisit.type ?? 'customer_service');
      setItems(existingVisit.items ?? []);
      setQuoteId(existingVisit.quote_id ?? null);

      const visitClient = clients.find((c) => c.id === existingVisit.client_id);
      if (visitClient) {
        setSelectedClient(visitClient);
        const firstEmail =
          visitClient.contacts?.find((c) => c.email)?.email ?? '';
        setRecipientEmail(firstEmail);
      }
    } else if (paramClientId) {
      const preFilledClient = clients.find((c) => c.id === paramClientId);
      if (preFilledClient) {
        setSelectedClient(preFilledClient);
        const firstEmail =
          preFilledClient.contacts?.find((c) => c.email)?.email ?? '';
        setRecipientEmail(firstEmail);
      }
      // Pre-fill from seguimiento (thread continuation)
      // Expo Router already decodes URL params — no decodeURIComponent needed.
      if (paramPrefillTitle) setTitle(paramPrefillTitle);
      if (paramPrefillNotes) setNotes(paramPrefillNotes);
    }
  }, [isEditMode, existingVisit?.id, paramClientId, clients]);

  useEffect(() => {
    if (visitType === 'sales_orders' && selectedClient) {
      fetchQuotesByClient(selectedClient.id);
    } else {
      clearClientQuotes();
    }
    return () => clearClientQuotes();
  }, [visitType, selectedClient?.id]);

  // Pre-populate items from client habitual products (sales_orders/quote, create mode only)
  useEffect(() => {
    const hasItemsType = visitType === 'sales_orders' || visitType === 'quote';
    if (hasItemsType && selectedClient && !isEditMode) {
      fetchClientProducts(selectedClient.id).then(() => {
        const clientProds = useProductsStore.getState().clientProducts;
        const allProducts = useProductsStore.getState().products;
        const prePopulated: QuoteItem[] = [];

        for (const cp of clientProds) {
          const product = allProducts.find((p) => p.id === cp.product_id);
          if (!product) continue;
          const presentation = product.presentations.find(
            (p) => p.id === cp.product_presentation_id
          );
          if (!presentation) continue;

          prePopulated.push({
            product_id: product.id,
            product_name: product.name,
            product_code: product.code,
            presentation_id: presentation.id,
            presentation_label: presentation.label,
            unit: presentation.unit,
            presentation_quantity_kg: presentation.quantity,
            custom_quantity_kg: null,
            quantity: 1,
            unit_price_usd: presentation.price_usd,
            freight_usd: presentation.freight_usd ?? 0,
            margin_pct: 0,
            total_usd:
              1 *
              (presentation.quantity ?? 0) *
              (presentation.price_usd + (presentation.freight_usd ?? 0)),
          });
        }

        if (prePopulated.length > 0) {
          setItems(prePopulated);
        }
      });
    } else if (!hasItemsType) {
      setItems([]);
    }
  }, [visitType, selectedClient?.id]);

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  const isValid = isEditMode
    ? true // In edit mode, client is fixed; date always has a value
    : selectedClient !== null;

  // -------------------------------------------------------------------------
  // Header buttons
  // -------------------------------------------------------------------------

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Editar gestión' : 'Nueva gestión',
      headerLeft: () => (
        <Pressable
          onPress={closeForm}
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
          accessibilityLabel="Guardar gestión"
          disabled={!isValid || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text
              style={[
                styles.headerButtonSave,
                !isValid && styles.headerButtonSaveDisabled,
              ]}
            >
              Guardar
            </Text>
          )}
        </Pressable>
      ),
    });
  }, [
    isValid,
    saving,
    selectedClient,
    selectedDate,
    selectedTime,
    notes,
    status,
    visitType,
    navigation,
    closeForm,
  ]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function computeTotal(quoteItems: QuoteItem[]): number {
    return quoteItems.reduce((sum, item) => sum + (item.total_usd ?? 0), 0);
  }

  function updateItem(index: number, changes: Partial<QuoteItem>) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, ...changes };
        const pkgKg =
          updated.presentation_quantity_kg ?? updated.custom_quantity_kg ?? 0;
        // Margin marks up the base price; freight is a pass-through cost
        // added on top, not marked up.
        const effectivePricePerKg =
          updated.unit_price_usd * (1 + updated.margin_pct / 100) +
          (updated.freight_usd ?? 0);
        updated.total_usd = updated.quantity * pkgKg * effectivePricePerKg;
        return updated;
      })
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleProductExpanded(id: string) {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addItemFromPresentation(
    product: Product,
    presentation: ProductPresentation
  ) {
    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        product_code: product.code,
        presentation_id: presentation.id,
        presentation_label: presentation.label,
        unit: presentation.unit,
        presentation_quantity_kg: presentation.quantity,
        custom_quantity_kg: null,
        quantity: 1,
        unit_price_usd: presentation.price_usd,
        freight_usd: presentation.freight_usd ?? 0,
        margin_pct: 0,
        total_usd:
          1 *
          (presentation.quantity ?? 0) *
          (presentation.price_usd + (presentation.freight_usd ?? 0)),
      },
    ]);
    setShowProductPicker(false);
    setProductSearch('');
    setExpandedProductIds(new Set());
  }

  async function handleSave() {
    if (!isValid || saving) return;

    setSaving(true);
    const isoString = combineDateAndTime(selectedDate, selectedTime);
    const hasItems = visitType === 'sales_orders' || visitType === 'quote';
    const computedAmount =
      hasItems && items.length > 0 ? computeTotal(items) : null;
    const itemsPayload =
      hasItems && items.length > 0
        ? items.map((i) => ({ ...i, total_usd: i.total_usd ?? 0 }))
        : [];

    let saveOk = false;

    if (isEditMode && visitId) {
      await updateVisit(visitId, {
        scheduled_at: isoString,
        title: title.trim() || null,
        contact_snapshot: selectedContact,
        notes: notes || undefined,
        status,
        type: visitType,
        amount: computedAmount,
        quote_id: quoteId,
        items: itemsPayload,
      });
      const freshError = useVisitsStore.getState().error;
      if (freshError) {
        showAlert('Error al guardar', freshError);
      } else {
        saveOk = true;
      }
    } else {
      if (!selectedClient) {
        setSaving(false);
        return;
      }
      const newVisit = await createVisit({
        client_id: selectedClient.id,
        scheduled_at: isoString,
        title: title || undefined,
        contact_snapshot: selectedContact,
        notes: notes || undefined,
        status,
        type: visitType,
        amount: computedAmount,
        quote_id: quoteId,
        items: itemsPayload,
        thread_id: paramThreadId || undefined,
      });

      if (!newVisit) {
        const freshError = useVisitsStore.getState().error;
        showAlert('Error al guardar', freshError ?? 'No se pudo crear la gestión');
      } else {
        // Promote to thread head if user opted in
        if (createAsThread && !paramThreadId) {
          await updateVisit(newVisit.id, { thread_id: newVisit.id } as any);
        }
        // Refresh client visit list so it's up-to-date when navigating back
        await fetchVisitsByClient(selectedClient.id);
        saveOk = true;

        // Sync client products after successful sales_orders save
        if (visitType === 'sales_orders' && items.length > 0) {
          await syncClientProducts(selectedClient.id, items);
        }

        // Send quote email (non-blocking — don't prevent navigation on failure)
        if (
          (visitType === 'sales_orders' || visitType === 'quote') &&
          recipientEmail.trim()
        ) {
          const recipientName = selectedClient.contacts?.find(
            (c) => c.email === recipientEmail.trim()
          )?.name;
          const { error: emailErr } = await sendQuote(
            newVisit.id,
            recipientEmail.trim(),
            recipientName
          );
          if (emailErr) {
            showAlert(
              'Email no enviado',
              `La cotización se guardó pero el email falló: ${emailErr}`
            );
          }
        }
      }
    }

    setSaving(false);

    if (saveOk) {
      closeForm();
    }
  }

  function applyDateDefaults(date: Date) {
    // Default time: latest visit on that date + gap, else 10:00
    const dateKey = dayjs(date).format('YYYY-MM-DD');
    const visitsOnDate = visits.filter(
      (v) => dayjs(v.scheduled_at).format('YYYY-MM-DD') === dateKey
    );
    if (visitsOnDate.length > 0) {
      const latest = visitsOnDate.reduce((a, b) =>
        a.scheduled_at > b.scheduled_at ? a : b
      );
      setSelectedTime(
        dayjs(latest.scheduled_at).add(gapMinutes, 'minute').toDate()
      );
    } else {
      setSelectedTime(dayjs().hour(10).minute(0).second(0).toDate());
    }
  }

  function handleDateChange(date: Date) {
    setSelectedDate(date);
    applyDateDefaults(date);
    if (Platform.OS === 'android') {
      // On Android, show time picker after date is selected
      setShowTimePicker(true);
    }
  }

  function handleTimeChange(time: Date) {
    setSelectedTime(time);
  }

  function handleDatePickerDismissAndroid() {
    setShowDatePicker(false);
  }

  function handleTimePickerDismissAndroid() {
    setShowTimePicker(false);
  }

  function handleClientSelect(client: Client) {
    setSelectedClient(client);
    setShowClientPicker(false);
    setClientSearch('');
    const firstEmail = client.contacts?.find((c) => c.email)?.email ?? '';
    if (firstEmail) setRecipientEmail(firstEmail);
  }

  // -------------------------------------------------------------------------
  // Filtered clients for picker
  // -------------------------------------------------------------------------

  const pickerProducts = useMemo(() => {
    return products
      .filter(
        (p) => productTypeFilter === 'all' || p.type === productTypeFilter
      )
      .filter(
        (p) =>
          !productSearch ||
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          (p.code && p.code.toLowerCase().includes(productSearch.toLowerCase()))
      );
  }, [products, productTypeFilter, productSearch]);

  const filteredClients = clientSearch.trim()
    ? clients.filter((c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase())
      )
    : clients;

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function FieldLabel({
    label,
    required,
  }: {
    label: string;
    required?: boolean;
  }) {
    return (
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.fieldRequired}> *</Text> : null}
      </Text>
    );
  }

  // -------------------------------------------------------------------------
  // Root render
  // -------------------------------------------------------------------------

  return (
    <>
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={320}
      >
        {/* ── Tipo de gestión ─────────────────────────────────────────────── */}
        <View style={styles.fieldGroup}>
          <FieldLabel label="Tipo de gestión" />
          <View style={styles.typeRow}>
            {VISIT_TYPE_OPTIONS_WITH_ICONS.map(({ value, label, icon }) => {
              const active = visitType === value;
              const typeColor = visitTypeColors[value];
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.typeOption,
                    active && {
                      borderColor: typeColor,
                      backgroundColor: typeColor + '18',
                    },
                  ]}
                  onPress={() => setVisitType(value)}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ checked: active }}
                >
                  <MaterialCommunityIcons
                    name={icon as 'briefcase-outline'}
                    size={18}
                    color={active ? typeColor : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeOptionLabel,
                      active && { color: typeColor },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Título ──────────────────────────────────────────────────────── */}
        <View style={styles.fieldGroup}>
          <FieldLabel label="Título (opcional)" />
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Ej: Seguimiento propuesta, Reclamo #123"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="sentences"
            returnKeyType="next"
            accessibilityLabel="Título de la gestión"
          />
        </View>

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
                  setShowClientPicker(false);
                  setClientSearch('');
                }}
                accessibilityRole="button"
                accessibilityLabel="Cancelar selección de cliente"
              >
                <Text style={styles.clientPickerCancelText}>Cancelar</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* ── Contacto involucrado ─────────────────────────────────────── */}
        {selectedClient && selectedClient.contacts.length > 0 && (
          <View style={styles.fieldGroup}>
            <FieldLabel label="Contacto involucrado (opcional)" />
            <View style={styles.contactPickerRow}>
              {selectedClient.contacts.map((contact, idx) => {
                const label =
                  contact.name ||
                  contact.phone ||
                  contact.email ||
                  `Contacto ${idx + 1}`;
                const isSelected =
                  selectedContact != null &&
                  contact.name === selectedContact.name &&
                  contact.phone === selectedContact.phone &&
                  contact.email === selectedContact.email;
                return (
                  <Pressable
                    key={`contact-${idx}`}
                    style={[
                      styles.contactChip,
                      isSelected && styles.contactChipActive,
                    ]}
                    onPress={() => {
                      const next = isSelected ? null : contact;
                      setSelectedContact(next);
                      if (next?.email) setRecipientEmail(next.email);
                    }}
                    accessibilityRole="radio"
                    accessibilityLabel={label}
                    accessibilityState={{ checked: isSelected }}
                  >
                    <MaterialCommunityIcons
                      name="account-outline"
                      size={16}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.contactChipLabel,
                        isSelected && styles.contactChipLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {selectedContact && (
              <View style={styles.contactDetail}>
                {selectedContact.phone ? (
                  <Text style={styles.contactDetailText}>
                    📞 {selectedContact.phone}
                  </Text>
                ) : null}
                {selectedContact.email ? (
                  <Text style={styles.contactDetailText}>
                    ✉️ {selectedContact.email}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        )}

        {/* ── Productos ───────────────────────────────────────────────────── */}
        {(visitType === 'sales_orders' || visitType === 'quote') && (
          <View style={styles.fieldGroup}>
            <FieldLabel label="Productos" />

            {items.map((item, index) => (
              <QuoteItemRow
                key={`${item.presentation_id}-${index}`}
                item={item}
                visitType={visitType}
                onChangeQuantity={(qty) => updateItem(index, { quantity: qty })}
                onChangeMargin={(pct) => updateItem(index, { margin_pct: pct })}
                onChangeCustomQty={(kg) =>
                  updateItem(index, { custom_quantity_kg: kg })
                }
                onRemove={() => removeItem(index)}
              />
            ))}

            <Pressable
              style={styles.addProductButton}
              onPress={() => {
                setProductSearch('');
                setProductTypeFilter('all');
                setExpandedProductIds(new Set());
                setShowProductPicker(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Agregar producto"
            >
              <MaterialCommunityIcons
                name="plus"
                size={18}
                color={colors.primary}
              />
              <Text style={styles.addProductButtonText}>Agregar producto</Text>
            </Pressable>

            {items.length > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>
                  $
                  {computeTotal(items).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  USD
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Destinatario del mail (sales_orders/quote) ───────────────────── */}
        {(visitType === 'sales_orders' || visitType === 'quote') && (
          <View style={styles.fieldGroup}>
            <FieldLabel label="Destinatario del mail" />
            <TextInput
              style={styles.titleInput}
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              placeholder="email@empresa.com"
              placeholderTextColor={colors.textDisabled}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Email del destinatario de la cotización"
            />
            {isEditMode && visitId && (
              <Pressable
                style={({ pressed }) => [
                  styles.resendButton,
                  pressed && styles.resendButtonPressed,
                  sendingQuote && styles.resendButtonDisabled,
                ]}
                disabled={sendingQuote || !recipientEmail.trim()}
                onPress={async () => {
                  if (!recipientEmail.trim()) return;
                  setSendingQuote(true);
                  const recipientName = selectedClient?.contacts?.find(
                    (c) => c.email === recipientEmail.trim()
                  )?.name;
                  const { error: emailErr } = await sendQuote(
                    visitId,
                    recipientEmail.trim(),
                    recipientName
                  );
                  setSendingQuote(false);
                  if (emailErr) {
                    showAlert(
                      'Error',
                      `No se pudo enviar el email: ${emailErr}`
                    );
                  } else {
                    showAlert('Enviado', 'Cotización enviada correctamente.');
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="Reenviar cotización por email"
              >
                {sendingQuote ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.resendButtonText}>
                    Reenviar cotización
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        )}

        {/* ── Cotización de origen ─────────────────────────────────────────── */}
        {visitType === 'sales_orders' && (
          <View style={styles.fieldGroup}>
            <FieldLabel label="Cotización de origen (opcional)" />
            {clientQuotes.length === 0 ? (
              <Text style={styles.emptyHint}>
                Sin cotizaciones previas para este cliente
              </Text>
            ) : (
              clientQuotes.map((q) => {
                const selected = quoteId === q.id;
                return (
                  <Pressable
                    key={q.id}
                    style={[
                      styles.quoteOption,
                      selected && styles.quoteOptionActive,
                    ]}
                    onPress={() => setQuoteId(selected ? null : q.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                  >
                    <Text style={styles.quoteOptionDate}>
                      {dayjs(q.scheduled_at).format('DD/MM/YYYY')}
                    </Text>
                    {q.amount != null && (
                      <Text style={styles.quoteOptionAmount}>
                        $
                        {q.amount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        USD
                      </Text>
                    )}
                    <StatusTypeBadge status={q.status} type="quote" />
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* ── Fecha + Hora ─────────────────────────────────────────────────── */}
        <View style={styles.fieldGroup}>
          <View style={styles.dateTimeRow}>
            {/* FECHA column */}
            <View style={styles.dateTimeCol}>
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
                    {dayjs(selectedDate).format('DD/MM/YY')}
                  </Text>
                  <MaterialCommunityIcons
                    name="calendar"
                    size={20}
                    color={colors.primary}
                  />
                </Pressable>
              ) : (
                <AppDatePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'android' ? 'calendar' : 'inline'}
                  onChange={handleDateChange}
                  accentColor={colors.primary}
                  locale="es"
                  isAndroidModal={Platform.OS === 'android' && showDatePicker}
                  onDismiss={handleDatePickerDismissAndroid}
                  containerStyle={
                    Platform.OS === 'ios' ? styles.iosDatePicker : undefined
                  }
                />
              )}
            </View>

            {/* HORA column */}
            <View style={styles.dateTimeCol}>
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
                <AppDatePicker
                  value={selectedTime}
                  mode="time"
                  display={Platform.OS === 'android' ? 'clock' : 'spinner'}
                  onChange={handleTimeChange}
                  accentColor={colors.primary}
                  locale="es"
                  isAndroidModal={Platform.OS === 'android' && showTimePicker}
                  onDismiss={handleTimePickerDismissAndroid}
                  containerStyle={
                    Platform.OS === 'ios' ? styles.iosTimePicker : undefined
                  }
                />
              )}
            </View>
          </View>
        </View>

        {/* ── Estado ───────────────────────────────────────────────────────── */}
        <View style={styles.fieldGroup}>
          <FieldLabel label="Estado" />
          <View style={styles.statusRow}>
            {(
              [
                {
                  value: 'pending',
                  icon: 'clock-outline',
                  color: colors.statusPending,
                },
                {
                  value: 'completed',
                  icon: 'check-circle-outline',
                  color: colors.statusCompleted,
                },
                {
                  value: 'canceled',
                  icon: 'close-circle-outline',
                  color: colors.statusCanceled,
                },
              ] as { value: VisitStatus; icon: string; color: string }[]
            ).map(({ value, icon, color }) => {
              const label = getStatusLabel(visitType, value);
              const active = status === value;
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.statusOption,
                    active && {
                      borderColor: color,
                      backgroundColor: color + '18',
                    },
                  ]}
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
              );
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
            accessibilityLabel="Notas de la gestión"
          />
        </View>

        {/* ── Crear como tema (create mode, not a seguimiento) ─────────────── */}
        {!isEditMode && !paramThreadId && (
          <View style={styles.fieldGroup}>
            <Pressable
              style={styles.threadToggleRow}
              onPress={() => setCreateAsThread((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityLabel="Crear como tema"
              accessibilityState={{ checked: createAsThread }}
            >
              <View
                style={[
                  styles.threadToggleBox,
                  createAsThread && styles.threadToggleBoxActive,
                ]}
              >
                {createAsThread ? (
                  <MaterialCommunityIcons
                    name="check"
                    size={14}
                    color={colors.textOnPrimary}
                  />
                ) : null}
              </View>
              <Text style={styles.threadToggleLabel}>Crear como tema</Text>
            </Pressable>
          </View>
        )}

        {/* ── Guardar gestión button (create mode) ─────────────────────────── */}
        {!isEditMode && (
          <View style={styles.fieldGroup}>
            <Pressable
              style={[
                styles.saveGestionButton,
                !isValid && styles.saveGestionButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!isValid || saving}
              accessibilityRole="button"
              accessibilityLabel="Guardar gestión"
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.saveGestionButtonText}>
                  Guardar gestión
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* ── Product picker modal ─────────────────────────────────────────── */}
      <Modal
        visible={showProductPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProductPicker(false)}
      >
        <View style={styles.pickerModal}>
          {/* Header */}
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Seleccionar producto</Text>
            <Pressable
              onPress={() => setShowProductPicker(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.textPrimary}
              />
            </Pressable>
          </View>

          {/* Search */}
          <View style={styles.pickerSearch}>
            <MaterialCommunityIcons
              name="magnify"
              size={18}
              color={colors.textSecondary}
            />
            <TextInput
              style={styles.pickerSearchInput}
              value={productSearch}
              onChangeText={setProductSearch}
              placeholder="Buscar producto..."
              placeholderTextColor={colors.textDisabled}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {productSearch.length > 0 && (
              <Pressable
                onPress={() => setProductSearch('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={16}
                  color={colors.textSecondary}
                />
              </Pressable>
            )}
          </View>

          {/* Type filter pills */}
          <View style={styles.pickerFilters}>
            {PRODUCT_FILTER_OPTIONS.map(({ value, label }) => {
              const active = productTypeFilter === value;
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.pickerFilterPill,
                    active && styles.pickerFilterPillActive,
                  ]}
                  onPress={() => setProductTypeFilter(value)}
                >
                  <Text
                    style={[
                      styles.pickerFilterPillText,
                      active && styles.pickerFilterPillTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Product list */}
          <ScrollView
            style={styles.pickerList}
            keyboardShouldPersistTaps="handled"
          >
            {pickerProducts.length === 0 ? (
              <View style={styles.pickerEmpty}>
                <Text style={styles.pickerEmptyText}>No hay productos</Text>
              </View>
            ) : (
              pickerProducts.map((product) => {
                const expanded = expandedProductIds.has(product.id);
                return (
                  <View key={product.id}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.pickerProductRow,
                        pressed && styles.pickerProductRowPressed,
                      ]}
                      onPress={() => toggleProductExpanded(product.id)}
                      accessibilityRole="button"
                    >
                      <View style={styles.pickerProductInfo}>
                        <Text
                          style={styles.pickerProductName}
                          numberOfLines={1}
                        >
                          {product.code ? `[${product.code}] ` : ''}
                          {product.name}
                        </Text>
                        <Text style={styles.pickerProductType}>
                          {product.type === 'formulated'
                            ? 'Formulado'
                            : 'Commodity'}
                          {' · '}
                          {product.presentations.length} presentación
                          {product.presentations.length !== 1 ? 'es' : ''}
                        </Text>
                      </View>
                      <MaterialCommunityIcons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </Pressable>

                    {expanded &&
                      product.presentations.map((pres) => {
                        const alreadyAdded = items.some(
                          (i) => i.presentation_id === pres.id
                        );
                        return (
                          <Pressable
                            key={pres.id}
                            style={[
                              styles.pickerPresRow,
                              alreadyAdded && styles.pickerPresRowDimmed,
                            ]}
                            onPress={() => {
                              if (!alreadyAdded)
                                addItemFromPresentation(product, pres);
                            }}
                            disabled={alreadyAdded}
                            accessibilityRole="button"
                            accessibilityLabel={`Agregar ${pres.label}`}
                            accessibilityState={{ disabled: alreadyAdded }}
                          >
                            <View style={styles.pickerPresInfo}>
                              <Text
                                style={[
                                  styles.pickerPresLabel,
                                  alreadyAdded && styles.pickerPresLabelDimmed,
                                ]}
                              >
                                {pres.label}
                              </Text>
                              <Text style={styles.pickerPresUnit}>
                                {pres.unit}
                                {pres.quantity ? ` · ${pres.quantity}` : ''}
                              </Text>
                            </View>
                            <View style={styles.pickerPresRight}>
                              <Text
                                style={[
                                  styles.pickerPresPrice,
                                  alreadyAdded && styles.pickerPresLabelDimmed,
                                ]}
                              >
                                $
                                {pres.price_usd.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{' '}
                                USD
                              </Text>
                              {alreadyAdded ? (
                                <MaterialCommunityIcons
                                  name="check"
                                  size={16}
                                  color={colors.textDisabled}
                                />
                              ) : (
                                <MaterialCommunityIcons
                                  name="plus-circle-outline"
                                  size={16}
                                  color={colors.primary}
                                />
                              )}
                            </View>
                          </Pressable>
                        );
                      })}

                    <View style={styles.pickerDivider} />
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
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
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  headerButtonSave: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
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
    fontWeight: fontWeight.medium,
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
    fontWeight: fontWeight.medium,
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
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },

  // Date + Time side-by-side row
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  dateTimeCol: {
    flex: 1,
    gap: spacing[2],
  },

  // Save gestión button (create mode bottom button)
  threadToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  threadToggleBox: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadToggleBoxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  threadToggleLabel: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  saveGestionButton: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveGestionButtonDisabled: {
    opacity: 0.5,
  },
  saveGestionButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
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

  // Type picker
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    height: 48,
    paddingHorizontal: spacing[3],
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  typeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeOptionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  typeOptionLabelActive: {
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
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },

  // Title
  titleInput: {
    height: 48,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },

  // Contact picker
  contactPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    height: 40,
    paddingHorizontal: spacing[3],
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
  },
  contactChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  contactChipLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    maxWidth: 160,
  },
  contactChipLabelActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  contactDetail: {
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  contactDetailText: {
    fontSize: fontSize.sm,
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

  // Product line items section
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    height: 48,
    paddingHorizontal: spacing[3],
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  addProductButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  totalAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },

  // Product picker modal
  pickerModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    margin: spacing[3],
    height: 48,
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    height: 48,
  },
  pickerFilters: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    marginBottom: spacing[2],
  },
  pickerFilterPill: {
    height: 36,
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pickerFilterPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  pickerFilterPillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  pickerFilterPillTextActive: {
    color: colors.primary,
  },
  pickerList: {
    flex: 1,
  },
  pickerEmpty: {
    padding: spacing[8],
    alignItems: 'center',
  },
  pickerEmptyText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  pickerProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 56,
    backgroundColor: colors.surface,
  },
  pickerProductRowPressed: {
    backgroundColor: colors.background,
  },
  pickerProductInfo: {
    flex: 1,
    gap: spacing[1],
  },
  pickerProductName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  pickerProductType: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  pickerPresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingLeft: spacing[6],
    paddingVertical: spacing[2],
    minHeight: 48,
    backgroundColor: colors.background,
  },
  pickerPresRowDimmed: {
    opacity: 0.4,
  },
  pickerPresInfo: {
    flex: 1,
    gap: spacing[1],
  },
  pickerPresLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  pickerPresLabelDimmed: {
    color: colors.textDisabled,
  },
  pickerPresUnit: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  pickerPresRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  pickerPresPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  pickerDivider: {
    height: 1,
    backgroundColor: colors.border,
  },

  // Resend quote button
  resendButton: {
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendButtonPressed: {
    opacity: 0.75,
  },
  resendButtonDisabled: {
    opacity: 0.4,
  },
  resendButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },

  // Quote picker
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    paddingVertical: spacing[2],
  },
  quoteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing[2],
  },
  quoteOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  quoteOptionDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  quoteOptionAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
});
