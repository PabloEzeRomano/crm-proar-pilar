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

import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { VisitRow } from '@/components/visits/VisitRow';

import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme';
import { useVisits } from '@/hooks/useVisits';
import dayjs from '@/lib/dayjs';
import { useAuthStore } from '@/stores/authStore';
import { useClientsStore } from '@/stores/clientsStore';
import { useVisitsStore } from '@/stores/visitsStore';
import { useTodayStore } from '@/stores/todayStore';
import { useProductsStore } from '@/stores/productsStore';
import { ClientProduct, Product, VisitWithClient } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format Argentina phone number for WhatsApp with pre-filled greeting */
function formatArgentinaWhatsApp(phone: string, name: string): string {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('54') ? digits : `54${digits}`;
  const greeting = encodeURIComponent(`Hola ${name}!`);
  return `https://wa.me/${normalized}?text=${greeting}`;
}

function handleContactPhone(phone: string, clientName?: string) {
  const whatsappLabel = clientName ? `Hola ${clientName}!` : 'WhatsApp';
  Alert.alert(phone, undefined, [
    { text: 'Llamar', onPress: () => Linking.openURL(`tel:${phone}`) },
    {
      text: 'WhatsApp',
      onPress: () => {
        const url = clientName
          ? formatArgentinaWhatsApp(phone, clientName)
          : `https://wa.me/${phone.replace(/\D/g, '')}`;
        Linking.openURL(url);
      },
    },
    { text: 'Cancelar', style: 'cancel' },
  ]);
}

function handleContactEmail(email: string) {
  Linking.openURL(`mailto:${email}`);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  const profile = useAuthStore((state) => state.profile);

  const client = useClientsStore((state) =>
    state.clients.find((c) => c.id === id)
  );
  const loading = useClientsStore((state) => state.loading);
  const fetchClient = useClientsStore((state) => state.fetchClient);
  const archiveClient = useClientsStore((state) => state.archiveClient);

  // Visits for this client — fetch directly by client_id to bypass global pagination
  const { visits, fetchVisitsByClient } = useVisits(id);

  // Products store
  const products = useProductsStore((s) => s.products);
  const clientProducts = useProductsStore((s) => s.clientProducts);
  const clientProductsLoading = useProductsStore(
    (s) => s.clientProductsLoading
  );
  const fetchClientProducts = useProductsStore((s) => s.fetchClientProducts);
  const addClientProduct = useProductsStore((s) => s.addClientProduct);
  const removeClientProduct = useProductsStore((s) => s.removeClientProduct);

  // Product picker state
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState<
    'all' | 'formulated' | 'commodity'
  >('all');
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(
    new Set()
  );

  // Resolve habitual products for this client
  const resolvedClientProducts = clientProducts
    .filter((cp) => cp.client_id === id)
    .map((cp) => {
      const product = products.find((p) => p.id === cp.product_id);
      const presentation = product?.presentations.find(
        (pr) => pr.id === cp.product_presentation_id
      );
      return { cp, product, presentation };
    })
    .filter(
      (
        r
      ): r is {
        cp: ClientProduct;
        product: Product;
        presentation: NonNullable<typeof r.presentation>;
      } => r.product != null && r.presentation != null
    );

  const pickerProducts = products
    .filter((p) => productTypeFilter === 'all' || p.type === productTypeFilter)
    .filter(
      (p) =>
        !productSearch ||
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(productSearch.toLowerCase()))
    );

  useEffect(() => {
    if (id) {
      fetchVisitsByClient(id);
      fetchClientProducts(id);
    }
  }, [id]);

  // Fetch client if not in store
  useEffect(() => {
    if (id && !client) {
      fetchClient(id);
    }
  }, [id, client, fetchClient]);

  const isOwner = client?.owner_user_id === profile?.id;

  // Set "Editar" button in the header — only for the owner
  useLayoutEffect(() => {
    if (!client) return;

    navigation.setOptions({
      headerRight: isOwner
        ? () => (
            <Pressable
              onPress={() => router.push(`/clients/form?clientId=${id}`)}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Editar cliente"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.headerButtonText}>Editar</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [client, id, isOwner, navigation, router]);

  // "Visitar hoy" button state
  const [visitarHoyLoading, setVisitarHoyLoading] = useState(false);
  const createVisit = useVisitsStore((state) => state.createVisit);
  const todayVisits = useTodayStore((state) => state.visits);
  const fetchTodayVisits = useTodayStore((state) => state.fetchTodayVisits);

  // Find today's visit for this client (if it exists)
  const todayVisit = todayVisits.find(
    (v) => v.client_id === id && dayjs(v.scheduled_at).isSame(dayjs(), 'day')
  );

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
            await archiveClient(id);
            router.back();
          },
        },
      ]
    );
  }

  const handleVisitarHoy = async () => {
    if (!id) return;

    setVisitarHoyLoading(true);
    try {
      // Read gap preference from AsyncStorage
      const gapStr = await AsyncStorage.getItem('visit-gap-minutes');
      const gap = gapStr ? Number(gapStr) : 60;

      // Compute smart time: latest visit in today's list + gap, fallback to 10:00
      let smartTime = dayjs().hour(10).minute(0).second(0);
      const todayList = todayVisits.filter((v) =>
        dayjs(v.scheduled_at).isSame(dayjs(), 'day')
      );
      if (todayList.length > 0) {
        const latest = todayList.reduce((a, b) =>
          a.scheduled_at > b.scheduled_at ? a : b
        );
        smartTime = dayjs(latest.scheduled_at).add(gap, 'minute');
      }

      // Create visit
      const newVisit = await createVisit({
        client_id: id,
        scheduled_at: smartTime.toISOString(),
        status: 'pending',
        notes: undefined,
      });

      if (newVisit) {
        // Refresh today's visits and navigate
        await fetchTodayVisits();
        router.push(`/visits/${newVisit.id}`);
      } else {
        Alert.alert('Error', 'No se pudo crear la visita');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al crear la visita');
    } finally {
      setVisitarHoyLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Not found
  // -------------------------------------------------------------------------

  if (!client) {
    if (loading) {
      return (
        <View style={styles.notFoundContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Cliente no encontrado</Text>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Link handlers
  // -------------------------------------------------------------------------

  function handleMaps() {
    const query = `${client?.address ?? ''} ${client?.city ?? ''}`.trim();
    if (!query) return;
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(query)}`);
  }

  const hasMapTarget = Boolean(client.address || client.city);

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function InfoRow({
    label,
    value,
  }: {
    label: string;
    value: string | null | undefined;
  }) {
    if (!value) return null;
    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    );
  }

  function SectionHeader({ title }: { title: string }) {
    return <Text style={styles.sectionHeader}>{title}</Text>;
  }

  function handleRemoveClientProduct(clientProductId: string) {
    Alert.alert(
      'Quitar producto',
      '¿Quitar este producto de los habituales del cliente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: () => removeClientProduct(clientProductId),
        },
      ]
    );
  }

  function toggleProductExpanded(productId: string) {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  // -------------------------------------------------------------------------
  // Root render
  // -------------------------------------------------------------------------

  return (
    <>
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
              <View
                key={index}
                style={[
                  styles.contactCard,
                  index > 0 && styles.contactCardBorder,
                ]}
              >
                {contact.name ? (
                  <Text style={styles.contactName}>{contact.name}</Text>
                ) : null}
                {contact.phone ? (
                  <Pressable
                    onPress={() =>
                      handleContactPhone(contact.phone!, client.name)
                    }
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

        {/* ── Sección: Productos habituales ───────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Productos habituales" />

          {clientProductsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : resolvedClientProducts.length === 0 ? (
            <Text style={styles.emptyField}>Sin productos habituales</Text>
          ) : (
            resolvedClientProducts.map(({ cp, product, presentation }) => (
              <View key={cp.id} style={styles.productRow}>
                <View style={styles.productRowContent}>
                  {product.code ? (
                    <Text style={styles.productCode}>[{product.code}]</Text>
                  ) : null}
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={styles.productPresentation}>
                    {presentation.label} · {presentation.unit}
                  </Text>
                </View>
                {isOwner && (
                  <Pressable
                    onPress={() => handleRemoveClientProduct(cp.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar ${product.name}`}
                  >
                    <MaterialCommunityIcons
                      name="close-circle-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                )}
              </View>
            ))
          )}

          {isOwner && (
            <Pressable
              style={styles.addProductButton}
              onPress={() => setShowProductPicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Agregar producto habitual"
            >
              <MaterialCommunityIcons
                name="plus"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.addProductButtonText}>Agregar producto</Text>
            </Pressable>
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
                onPress={
                  todayVisit
                    ? () => router.push(`/visits/${todayVisit.id}`)
                    : handleVisitarHoy
                }
                disabled={visitarHoyLoading}
                accessibilityRole="button"
                accessibilityLabel={
                  todayVisit ? 'Ver visita de hoy' : 'Visitar hoy'
                }
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

      {/* ── Product picker modal ─────────────────────────────────────── */}
      <Modal
        visible={showProductPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProductPicker(false)}
      >
        <View style={styles.pickerModal}>
          <View style={styles.pickerModalHeader}>
            <Text style={styles.pickerModalTitle}>
              Agregar producto habitual
            </Text>
            <Pressable
              onPress={() => {
                setShowProductPicker(false);
                setProductSearch('');
                setProductTypeFilter('all');
                setExpandedProductIds(new Set());
              }}
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

          <View style={styles.pickerFilters}>
            {[
              { value: 'all' as const, label: 'Todos' },
              { value: 'formulated' as const, label: 'Formulados' },
              { value: 'commodity' as const, label: 'Commodities' },
            ].map(({ value, label }) => {
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
                        const alreadyAdded = clientProducts.some(
                          (cp) =>
                            cp.client_id === id &&
                            cp.product_id === product.id &&
                            cp.product_presentation_id === pres.id
                        );
                        return (
                          <Pressable
                            key={pres.id}
                            style={[
                              styles.pickerPresRow,
                              alreadyAdded && styles.pickerPresRowDimmed,
                            ]}
                            onPress={async () => {
                              if (!alreadyAdded) {
                                await addClientProduct(id, product.id, pres.id);
                                setShowProductPicker(false);
                                setProductSearch('');
                                setExpandedProductIds(new Set());
                              }
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

  // Habitual products section
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  productRowContent: {
    flex: 1,
    gap: spacing[1],
  },
  productCode: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium as '500',
  },
  productName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  productPresentation: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    minHeight: 48,
    paddingVertical: spacing[2],
    alignSelf: 'flex-start',
  },
  addProductButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.primary,
  },

  // Product picker modal
  pickerModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerModalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as '600',
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
    fontWeight: fontWeight.medium as '500',
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
    fontWeight: fontWeight.medium as '500',
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
    fontWeight: fontWeight.medium as '500',
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
  pickerDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
