import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  shadows,
  spacing,
} from '@/constants/theme';
import { SearchableSelect } from '@crm/core';

import { useAuthStore } from '@/stores/authStore';
import { useCampaignsStore } from '@/stores/campaignsStore';
import { useFinanciersStore } from '@/stores/financiersStore';
import { usePaymentMethodsStore } from '@/stores/paymentMethodsStore';
import type { CampaignOffer, CampaignStatus } from '@/types';

const statusLabel: Record<CampaignStatus, string> = {
  active: 'Activa',
  paused: 'Pausada',
  completed: 'Completada',
};

const statusColor: Record<CampaignStatus, string> = {
  active: colors.success,
  paused: colors.warning,
  completed: colors.statusCanceled,
};

const STATUS_OPTIONS: CampaignStatus[] = ['active', 'paused', 'completed'];

function OfferRow({
  offer,
  onDelete,
}: {
  offer: CampaignOffer;
  onDelete: () => void;
}) {
  return (
    <View style={styles.offerRow}>
      <View style={styles.offerContent}>
        <Text style={styles.offerName}>{offer.name}</Text>
        {offer.description && (
          <Text style={styles.offerDesc} numberOfLines={2}>
            {offer.description}
          </Text>
        )}
        {offer.payment_methods && offer.payment_methods.length > 0 && (
          <Text style={styles.offerMeta}>
            Medios: {offer.payment_methods.join(', ')}
          </Text>
        )}
        {offer.financing && (
          <Text style={styles.offerMeta}>Financiera: {offer.financing}</Text>
        )}
      </View>
      <Pressable onPress={onDelete} hitSlop={8} style={styles.iconBtn}>
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={18}
          color={colors.error}
        />
      </Pressable>
    </View>
  );
}

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const profile = useAuthStore((s) => s.profile);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'root';

  const campaigns = useCampaignsStore((s) => s.campaigns);
  const offers = useCampaignsStore((s) => s.offers);
  const offersLoading = useCampaignsStore((s) => s.offersLoading);
  const updateCampaign = useCampaignsStore((s) => s.updateCampaign);
  const deleteCampaign = useCampaignsStore((s) => s.deleteCampaign);
  const fetchOffers = useCampaignsStore((s) => s.fetchOffers);
  const createOffer = useCampaignsStore((s) => s.createOffer);
  const deleteOffer = useCampaignsStore((s) => s.deleteOffer);

  const paymentMethods = usePaymentMethodsStore((s) => s.items);
  const fetchPaymentMethods = usePaymentMethodsStore((s) => s.fetchItems);
  const financiers = useFinanciersStore((s) => s.items);
  const fetchFinanciers = useFinanciersStore((s) => s.fetchItems);

  const campaign = campaigns.find((c) => c.id === id);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // Quick-add offer
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerName, setOfferName] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerFinancing, setOfferFinancing] = useState('');
  const [offerPaymentMethods, setOfferPaymentMethods] = useState<string[]>([]);

  useEffect(() => {
    if (id) fetchOffers(id);
    fetchPaymentMethods();
    fetchFinanciers();
  }, [id]);

  if (!campaign) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Campaña no encontrada</Text>
      </View>
    );
  }

  const startEdit = () => {
    setEditName(campaign.name);
    setEditDesc(campaign.description ?? '');
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    await updateCampaign(id, {
      name: editName.trim(),
      description: editDesc.trim() || undefined,
    });
    setSaving(false);
    setIsEditing(false);
  };

  const changeStatus = async (status: CampaignStatus) => {
    await updateCampaign(id, { status });
  };

  const confirmDelete = () => {
    const doDelete = async () => {
      await deleteCampaign(id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Eliminar "${campaign.name}"?`)) doDelete();
    } else {
      Alert.alert('Eliminar campaña', `¿Eliminar "${campaign.name}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const confirmDeleteOffer = (offer: CampaignOffer) => {
    const doDelete = () => deleteOffer(offer.id);
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Eliminar oferta "${offer.name}"?`)) doDelete();
    } else {
      Alert.alert('Eliminar oferta', `¿Eliminar "${offer.name}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleAddOffer = async () => {
    if (!offerName.trim()) return;
    await createOffer(id, {
      name: offerName.trim(),
      description: offerDesc.trim() || undefined,
      financing: offerFinancing || undefined,
      payment_methods:
        offerPaymentMethods.length > 0 ? offerPaymentMethods : undefined,
    });
    setOfferName('');
    setOfferDesc('');
    setOfferFinancing('');
    setOfferPaymentMethods([]);
    setShowOfferForm(false);
  };

  return (
    <>
      <Stack.Screen options={{ title: campaign.name }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header / Edit */}
        {isEditing ? (
          <View style={styles.section}>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nombre"
              placeholderTextColor={colors.textDisabled}
            />
            <TextInput
              style={[styles.input, styles.multiline]}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Descripción"
              placeholderTextColor={colors.textDisabled}
              multiline
            />
            <View style={styles.editActions}>
              <Pressable
                style={styles.btnSecondary}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.btnPrimary, saving && styles.btnDisabled]}
                onPress={saveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.textOnPrimary}
                  />
                ) : (
                  <Text style={styles.btnPrimaryText}>Guardar</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.headerRow}>
              <View style={styles.headerContent}>
                <Text style={styles.title}>{campaign.name}</Text>
                {campaign.description && (
                  <Text style={styles.description}>{campaign.description}</Text>
                )}
              </View>
              {isAdmin && (
                <View style={styles.headerActions}>
                  <Pressable
                    onPress={startEdit}
                    hitSlop={8}
                    style={styles.iconBtn}
                  >
                    <MaterialCommunityIcons
                      name="pencil-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                  <Pressable
                    onPress={confirmDelete}
                    hitSlop={8}
                    style={styles.iconBtn}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={20}
                      color={colors.error}
                    />
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Status */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estado</Text>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((s) => (
                <Pressable
                  key={s}
                  style={[
                    styles.statusBtn,
                    campaign.status === s && {
                      backgroundColor: statusColor[s] + '20',
                      borderColor: statusColor[s],
                    },
                  ]}
                  onPress={() => changeStatus(s)}
                >
                  <Text
                    style={[
                      styles.statusBtnText,
                      campaign.status === s && {
                        color: statusColor[s],
                        fontWeight: fontWeight.semibold,
                      },
                    ]}
                  >
                    {statusLabel[s]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Assignments */}
        {isAdmin && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Asignaciones</Text>
              <Pressable
                style={styles.btnPrimary}
                onPress={() =>
                  router.push(`/campaigns/assign?campaignId=${id}`)
                }
              >
                <Text style={styles.btnPrimaryText}>Asignar clientes</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Offers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ofertas</Text>
            {isAdmin && (
              <Pressable
                onPress={() => setShowOfferForm(!showOfferForm)}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name={showOfferForm ? 'close' : 'plus-circle-outline'}
                  size={24}
                  color={colors.primary}
                />
              </Pressable>
            )}
          </View>

          {showOfferForm && (
            <View style={styles.offerForm}>
              <TextInput
                style={styles.input}
                value={offerName}
                onChangeText={setOfferName}
                placeholder="Nombre de la oferta *"
                placeholderTextColor={colors.textDisabled}
              />
              <TextInput
                style={styles.input}
                value={offerDesc}
                onChangeText={setOfferDesc}
                placeholder="Descripción"
                placeholderTextColor={colors.textDisabled}
              />
              <SearchableSelect
                label="Medios de pago"
                placeholder="Medios de pago"
                multiple
                options={paymentMethods
                  .filter((p) => p.active)
                  .map((p) => p.name)}
                selected={offerPaymentMethods}
                onChange={setOfferPaymentMethods}
              />
              <SearchableSelect
                label="Financiera"
                placeholder="Financiera"
                options={financiers.filter((f) => f.active).map((f) => f.name)}
                selected={offerFinancing ? [offerFinancing] : []}
                onChange={(names) => setOfferFinancing(names[0] ?? '')}
              />
              <Pressable style={styles.btnPrimary} onPress={handleAddOffer}>
                <Text style={styles.btnPrimaryText}>Agregar oferta</Text>
              </Pressable>
            </View>
          )}

          {offersLoading ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ marginTop: spacing[3] }}
            />
          ) : offers.length === 0 ? (
            <Text style={styles.emptyText}>Sin ofertas</Text>
          ) : (
            offers.map((o) => (
              <OfferRow
                key={o.id}
                offer={o}
                onDelete={() => confirmDeleteOffer(o)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[20],
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    gap: spacing[3],
    ...shadows.subtle,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  headerRow: { flexDirection: 'row', gap: spacing[3] },
  headerContent: { flex: 1, gap: spacing[1] },
  headerActions: { flexDirection: 'row', gap: spacing[1] },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  description: { fontSize: fontSize.base, color: colors.textSecondary },
  statusRow: { flexDirection: 'row', gap: spacing[2] },
  statusBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  statusBtnText: { fontSize: fontSize.sm, color: colors.textSecondary },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: fontSize.base,
    color: colors.textPrimary,
    minHeight: 48,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  editActions: {
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'flex-end',
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  btnSecondary: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecondaryText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  iconBtn: {
    padding: spacing[2],
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerForm: {
    gap: spacing[3],
    padding: spacing[3],
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing[2],
  },
  offerContent: { flex: 1, gap: 2 },
  offerName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  offerDesc: { fontSize: fontSize.sm, color: colors.textSecondary },
  offerMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
    paddingVertical: spacing[2],
  },
});
