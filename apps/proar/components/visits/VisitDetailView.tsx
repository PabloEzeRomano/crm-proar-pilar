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

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  useLocalSearchParams,
  useNavigation,
  usePathname,
  useRouter,
} from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { StatusTypeBadge } from '@/components/ui/StatusTypeBadge';
import { showConfirm } from '@/lib/dialog';

import { useVisitsStore } from '@/stores/visitsStore';
import { useAuthStore } from '@/stores/authStore';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme';
import dayjs, { fromUTC } from '@/lib/dayjs';

// ---------------------------------------------------------------------------
// Save indicator type
// ---------------------------------------------------------------------------

type SaveState = 'idle' | 'saving' | 'saved';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VisitDetailView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const pathname = usePathname();

  const currentUser = useAuthStore((s) => s.profile);
  const editFormPath = pathname.startsWith('/agenda')
    ? `/agenda/visits/form?visitId=${id}`
    : pathname.startsWith('/clients')
      ? `/clients/visits/form?visitId=${id}`
      : `/visits/form?visitId=${id}`;

  const seguimientoFormBase = pathname.startsWith('/agenda')
    ? '/agenda/visits/form'
    : pathname.startsWith('/clients')
      ? '/clients/visits/form'
      : '/visits/form';

  const visit = useVisitsStore((state) =>
    state.visits.find((v) => v.id === id)
  );
  const error = useVisitsStore((state) => state.error);
  const deleting = useVisitsStore((state) => state.deleting);
  const deleteError = useVisitsStore((state) => state.deleteError);
  const fetchVisit = useVisitsStore((state) => state.fetchVisit);
  const updateVisit = useVisitsStore((state) => state.updateVisit);
  const updateStatus = useVisitsStore((state) => state.updateStatus);
  const deleteVisit = useVisitsStore((state) => state.deleteVisit);
  // Must be declared before any early return (Rules of Hooks).
  // Selector returns the stable array reference; filter runs outside
  // the subscription to avoid a new array on every render (infinite loop).
  const allVisits = useVisitsStore((s) => s.visits);
  const linkedSales = useMemo(
    () => allVisits.filter((v) => v.quote_id === id),
    [allVisits, id]
  );

  // If the visit isn't in the store yet (e.g. navigating from Today tab
  // before visitsStore has been populated), fetch it on demand.
  useEffect(() => {
    if (!visit && id) fetchVisit(id);
  }, [id]);

  const [notesText, setNotesText] = useState<string>(visit?.notes ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [statusLoading, setStatusLoading] = useState(false);
  const [temaSheetVisible, setTemaSheetVisible] = useState(false);
  const [temaTitle, setTemaTitle] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNotesRef = useRef<string | null>(null);

  // Sync local notes when the store visit changes (only if no pending edit)
  useEffect(() => {
    if (visit && pendingNotesRef.current === null) {
      setNotesText(visit.notes ?? '');
    }
  }, [visit]);

  const isOwner = visit ? visit.owner_user_id === currentUser?.id : false;

  const navigateToSeguimiento = async (title: string) => {
    if (!visit) return;
    if (!visit.thread_id) {
      await updateVisit(visit.id, { thread_id: visit.id, title } as any);
    }
    const threadId = visit.thread_id ?? visit.id;
    const params = new URLSearchParams({
      clientId: clientId,
      threadId,
      prefillTitle: title,
      prefillNotes: visit.notes ?? '',
    });
    router.push(`${seguimientoFormBase}?${params.toString()}` as any);
  };

  const confirmTema = async () => {
    const title = temaTitle.trim();
    if (!title) return;
    setTemaSheetVisible(false);
    await navigateToSeguimiento(title);
  };

  // Set header: "Editar" button (only for visit owner)
  useLayoutEffect(() => {
    if (!visit) return;
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </Pressable>
      ),
      headerRight: isOwner
        ? () => (
            <Pressable
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onPress={() => router.push(editFormPath as any)}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Editar gestión"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.headerButtonText}>Editar</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [visit, id, navigation, router, isOwner]);

  // -------------------------------------------------------------------------
  // Not found / loading
  // -------------------------------------------------------------------------

  if (!visit) {
    return (
      <View style={styles.notFoundContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleNotesChange(text: string) {
    setNotesText(text);
    pendingNotesRef.current = text;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      const latest = pendingNotesRef.current ?? text;
      const originalNotes = useVisitsStore.getState().visits.find((v) => v.id === id)?.notes ?? '';
      if (latest === originalNotes) {
        pendingNotesRef.current = null;
        return;
      }

      setSaveState('saving');
      await updateVisit(id, { notes: latest });

      const freshError = useVisitsStore.getState().error;
      pendingNotesRef.current = null;

      if (freshError) {
        setSaveState('idle');
        return;
      }
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    }, 1500);
  }

  async function handleDelete() {
    const ok = await showConfirm({
      title: 'Eliminar gestión',
      message: '¿Estás seguro? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    await deleteVisit(id);
    if (!deleteError) {
      router.back();
    }
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function SectionLabel({ title }: { title: string }) {
    return <Text style={styles.sectionLabel}>{title}</Text>;
  }

  const clientName = visit.client?.name ?? 'Cliente desconocido';
  const clientIndustry = visit.client?.industry ?? null;
  const clientId = visit.client?.id ?? visit.client_id;

  const rawDate = fromUTC(visit.scheduled_at).format('dddd D [de] MMMM · HH:mm');
  const formattedDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

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
      extraScrollHeight={80}
    >
      {/* ── Sección: Título ───────────────────────────────────────────── */}
      {visit.title ? (
        <View style={styles.section}>
          <SectionLabel title="Título" />
          <Text style={styles.visitTitle}>{visit.title}</Text>
        </View>
      ) : null}

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

      {/* ── Sección: Contacto involucrado ────────────────────────────── */}
      {visit.contact_snapshot && (
        <View style={styles.section}>
          <SectionLabel title="Contacto involucrado" />
          {visit.contact_snapshot.name ? (
            <Text style={styles.contactSnapshotName}>
              {visit.contact_snapshot.name}
            </Text>
          ) : null}
          {visit.contact_snapshot.phone ? (
            <Text style={styles.contactSnapshotDetail}>
              📞 {visit.contact_snapshot.phone}
            </Text>
          ) : null}
          {visit.contact_snapshot.email ? (
            <Text style={styles.contactSnapshotDetail}>
              ✉️ {visit.contact_snapshot.email}
            </Text>
          ) : null}
        </View>
      )}

      {/* ── Sección: Fecha ─────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionLabel title="Fecha" />
        <Text style={styles.dateText}>{formattedDate}</Text>
      </View>

      {/* ── Sección: Estado y Tipo ─────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionLabel title="Estado" />
        <View style={styles.statusSwitcher}>
          {(['pending', 'completed', 'canceled'] as const).map((s) => {
            const active = visit.status === s;
            const cfg = {
              pending: {
                label: 'Pendiente',
                color: colors.statusPending,
                bg: colors.statusPendingLight,
              },
              completed: {
                label: 'Completada',
                color: colors.statusCompleted,
                bg: colors.statusCompletedLight,
              },
              canceled: {
                label: 'Cancelada',
                color: colors.statusCanceled,
                bg: colors.statusCanceledLight,
              },
            }[s];
            return (
              <Pressable
                key={s}
                style={[
                  styles.switcherPill,
                  active && { backgroundColor: cfg.bg, borderColor: cfg.color },
                ]}
                onPress={async () => {
                  if (!isOwner || statusLoading || visit.status === s) return;
                  setStatusLoading(true);
                  await updateStatus(id, s);
                  setStatusLoading(false);
                }}
                disabled={!isOwner || statusLoading}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.switcherPillText,
                    active && { color: cfg.color, fontWeight: fontWeight.bold },
                  ]}
                >
                  {cfg.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {/* Keep type badge below switcher */}
        <View style={styles.statusTypeRow}>
          <View style={styles.statusTypeItem}>
            <SectionLabel title="Tipo" />
            <StatusTypeBadge type={visit.type} />
          </View>
        </View>
      </View>

      {/* ── Monto (solo cotizaciones y ventas con monto) ───────────────── */}
      {visit.amount != null && visit.type === 'sales_orders' ? (
        <View style={styles.section}>
          <SectionLabel title="Monto" />
          <Text style={styles.amountText}>
            $
            {visit.amount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            USD
          </Text>
        </View>
      ) : null}

      {/* ── Productos (cotizaciones y ventas con items) ────────────────── */}
      {visit.items &&
      visit.items.length > 0 &&
      visit.type === 'sales_orders' ? (
        <View style={styles.section}>
          <SectionLabel title="Productos" />
          {visit.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>
                  {item.product_code ? `[${item.product_code}] ` : ''}
                  {item.product_name}
                </Text>
                <Text style={styles.itemSub}>
                  {item.presentation_label} · {item.quantity} envase
                  {item.quantity !== 1 ? 's' : ''}
                  {item.margin_pct > 0 ? ` · +${item.margin_pct}%` : ''}
                </Text>
                <Text style={styles.itemSub}>
                  $
                  {item.unit_price_usd.toLocaleString('en-US', {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  })}{' '}
                  USD/{item.unit}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                $
                {(item.total_usd ?? 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                USD
              </Text>
            </View>
          ))}
          <View style={styles.itemsTotalRow}>
            <Text style={styles.itemsTotalLabel}>Total</Text>
            <Text style={styles.itemsTotalAmount}>
              $
              {visit.amount?.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              USD
            </Text>
          </View>
        </View>
      ) : null}

      {/* ── Cotización de origen (solo ventas con quote_id) ─────────────── */}
      {visit.quote_id ? (
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
      ) : null}

      {/* ── Ventas generadas (solo cotizaciones con ventas vinculadas) ───── */}
      {visit.type === 'sales_orders' && linkedSales.length > 0 ? (
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
                    $
                    {sale.amount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    USD
                  </Text>
                ) : null}
                <StatusTypeBadge status={sale.status} type="sales_orders" />
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* ── Sección: Notas / Minuta ─────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.notesSectionHeader}>
          <SectionLabel title="Minuta" />
          {saveState === 'saving' ? (
            <Text style={styles.saveIndicator}>Guardando...</Text>
          ) : saveState === 'saved' ? (
            <Text style={[styles.saveIndicator, styles.saveIndicatorSaved]}>
              Guardado
            </Text>
          ) : null}
        </View>

        <TextInput
          style={styles.notesInput}
          value={notesText}
          onChangeText={handleNotesChange}
          placeholder="Añadir notas de la gestión..."
          placeholderTextColor={colors.textDisabled}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          accessibilityLabel="Notas de la visita"
        />
      </View>

      {/* ── Seguimiento (solo propietario) ─────────────────────────────── */}
      {isOwner && visit ? (
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionButtonSeguimiento,
              pressed && styles.actionButtonSeguimientoPressed,
            ]}
            onPress={() => {
              if (!visit.title) {
                setTemaTitle('');
                setTemaSheetVisible(true);
              } else {
                navigateToSeguimiento(visit.title);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Dar seguimiento a esta gestión"
          >
            <MaterialCommunityIcons
              name="arrow-right-circle-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.actionButtonSeguimientoText}>
              Dar seguimiento
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* ── Eliminar gestión (solo propietario) ────────────────────────── */}
      {isOwner ? (
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
              <Text style={styles.actionButtonDeleteText}>
                Eliminar gestión
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </KeyboardAwareScrollView>

      {/* ── Sheet: nombre del tema (primera vez en un hilo) ─────────────── */}
      <Modal
        visible={temaSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTemaSheetVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setTemaSheetVisible(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Nombre del tema</Text>
            <Text style={styles.sheetSub}>
              Se asignará a esta gestión y a todos los seguimientos del hilo.
            </Text>
            <TextInput
              style={styles.sheetInput}
              value={temaTitle}
              onChangeText={setTemaTitle}
              placeholder="Ej: Propuesta técnica, Reclamo #12…"
              placeholderTextColor={colors.textDisabled}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={confirmTema}
            />
            <Pressable
              style={[styles.sheetButton, !temaTitle.trim() && styles.sheetButtonDisabled]}
              onPress={confirmTema}
              disabled={!temaTitle.trim()}
              accessibilityRole="button"
            >
              <Text style={styles.sheetButtonText}>Continuar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
    paddingTop: spacing[3],
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
    fontWeight: fontWeight.semibold,
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
    borderRadius: 14,
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  // Title section
  visitTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    lineHeight: fontSize.lg * 1.3,
  },

  // Contact snapshot
  contactSnapshotName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  contactSnapshotDetail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing[1],
  },

  // Client section
  clientName: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
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
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  clientLink: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
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
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },

  // Date
  dateText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
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
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },

  // Items table
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemLeft: {
    flex: 1,
    gap: spacing[1],
    paddingRight: spacing[3],
  },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  itemSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  itemTotal: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  itemPricePerKg: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  itemsTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[3],
  },
  itemsTotalLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  itemsTotalAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
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
    fontWeight: fontWeight.medium,
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
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  linkedRowAmount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // Status switcher
  statusSwitcher: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  switcherPill: {
    flex: 1,
    height: 38,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherPillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
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
    fontWeight: fontWeight.semibold,
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
    fontWeight: fontWeight.semibold,
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
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  actionButtonSeguimiento: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  actionButtonSeguimientoPressed: {
    opacity: 0.75,
  },
  actionButtonSeguimientoText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },

  // Tema sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing[6],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  sheetTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  sheetSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: -spacing[2],
  },
  sheetInput: {
    height: 48,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  sheetButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetButtonDisabled: {
    opacity: 0.4,
  },
  sheetButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});
