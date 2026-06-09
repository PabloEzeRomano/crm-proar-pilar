import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
} from 'react-native';

import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme';
import { useAssignmentsStore } from '@/stores/assignmentsStore';
import { useCampaignsStore } from '@/stores/campaignsStore';
import { useClientsStore } from '@/stores/clientsStore';
import { useInteractionsStore } from '@/stores/interactionsStore';
import { useRejectionReasonsStore } from '@/stores/rejectionReasonsStore';
import type {
  ContactResult,
  InteractionChannel,
  InterestResult,
} from '@/types';

// ---------------------------------------------------------------------------
// Option configs
// ---------------------------------------------------------------------------

const CHANNELS: { key: InteractionChannel; label: string; icon: string }[] = [
  { key: 'phone', label: 'Teléfono', icon: 'phone' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' },
  { key: 'in_person', label: 'Presencial', icon: 'account' },
  { key: 'email', label: 'Email', icon: 'email-outline' },
];

const CONTACT_RESULTS: { key: ContactResult; label: string }[] = [
  { key: 'contacted', label: 'Contactado' },
  { key: 'not_contacted', label: 'No contactado' },
  { key: 'no_answer', label: 'No atiende' },
  { key: 'wrong_number', label: 'Número equivocado' },
];

const INTEREST_RESULTS: { key: InterestResult; label: string }[] = [
  { key: 'interested', label: 'Interesado' },
  { key: 'not_interested', label: 'No interesado' },
  { key: 'not_qualified', label: 'No califica' },
  { key: 'follow_up', label: 'Seguimiento' },
  { key: 'sale', label: 'Venta' },
];

// ---------------------------------------------------------------------------
// Chip selector component
// ---------------------------------------------------------------------------

function ChipSelector<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; icon?: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <Pressable
          key={opt.key}
          style={[styles.chip, value === opt.key && styles.chipActive]}
          onPress={() => onChange(opt.key)}
        >
          {opt.icon && (
            <MaterialCommunityIcons
              name={opt.icon as any}
              size={16}
              color={value === opt.key ? colors.textOnPrimary : colors.textSecondary}
            />
          )}
          <Text style={[styles.chipText, value === opt.key && styles.chipTextActive]}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

export default function NewInteractionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    assignmentId?: string;
    campaignId?: string;
    clientId?: string;
  }>();

  const campaigns = useCampaignsStore((s) => s.campaigns);
  const fetchCampaigns = useCampaignsStore((s) => s.fetchCampaigns);
  const offers = useCampaignsStore((s) => s.offers);
  const fetchOffers = useCampaignsStore((s) => s.fetchOffers);

  const clients = useClientsStore((s) => s.clients);
  const fetchClients = useClientsStore((s) => s.fetchClients);

  const reasons = useRejectionReasonsStore((s) => s.reasons);
  const fetchReasons = useRejectionReasonsStore((s) => s.fetchReasons);

  const createInteraction = useInteractionsStore((s) => s.createInteraction);
  const storeError = useInteractionsStore((s) => s.error);

  // Form state
  const [campaignId, setCampaignId] = useState(params.campaignId ?? '');
  const [clientId, setClientId] = useState(params.clientId ?? '');
  const [channel, setChannel] = useState<InteractionChannel | null>(null);
  const [contactResult, setContactResult] = useState<ContactResult | null>(null);
  const [interestResult, setInterestResult] = useState<InterestResult | null>(null);
  const [rejectionReasonId, setRejectionReasonId] = useState('');
  const [offerId, setOfferId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [financing, setFinancing] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
    fetchClients();
    fetchReasons();
  }, []);

  useEffect(() => {
    if (campaignId) fetchOffers(campaignId);
  }, [campaignId]);

  // Conditional visibility
  const showInterest = contactResult === 'contacted';
  const showRejection = interestResult === 'not_interested';
  const showSaleDetails = interestResult === 'sale';

  const handleSave = async () => {
    if (!campaignId || !clientId || !channel || !contactResult) {
      setError('Completar campaña, cliente, canal y resultado de contacto');
      return;
    }

    setError(null);
    setSaving(true);

    const { data: { user } } = await (await import('../../../lib/supabase')).supabase.auth.getUser();

    if (!user) {
      setError('No autenticado');
      setSaving(false);
      return;
    }

    const result = await createInteraction({
      user_id: user.id,
      assignment_id: params.assignmentId ?? null,
      campaign_id: campaignId,
      client_id: clientId,
      channel,
      contact_result: contactResult,
      interest_result: showInterest ? interestResult : null,
      rejection_reason_id: showRejection && rejectionReasonId ? rejectionReasonId : null,
      offer_id: showSaleDetails && offerId ? offerId : null,
      payment_method: showSaleDetails && paymentMethod ? paymentMethod : null,
      financing: showSaleDetails && financing ? financing : null,
      invoice_number: showSaleDetails && invoiceNumber ? invoiceNumber : null,
      amount: showSaleDetails && amount ? parseFloat(amount) : null,
      notes: notes.trim() || null,
    });

    setSaving(false);

    if (result) {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Campaign picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Campaña *</Text>
          <View style={styles.pickerRow}>
            {campaigns.filter((c) => c.status === 'active').map((c) => (
              <Pressable
                key={c.id}
                style={[styles.chip, campaignId === c.id && styles.chipActive]}
                onPress={() => setCampaignId(c.id)}
              >
                <Text style={[styles.chipText, campaignId === c.id && styles.chipTextActive]}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Client picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Cliente *</Text>
          <View style={styles.pickerRow}>
            {clients.slice(0, 20).map((c) => (
              <Pressable
                key={c.id}
                style={[styles.chip, clientId === c.id && styles.chipActive]}
                onPress={() => setClientId(c.id)}
              >
                <Text style={[styles.chipText, clientId === c.id && styles.chipTextActive]}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
            {clients.length > 20 && (
              <Text style={styles.moreText}>+{clients.length - 20} más</Text>
            )}
          </View>
        </View>

        {/* Channel */}
        <View style={styles.field}>
          <Text style={styles.label}>Canal *</Text>
          <ChipSelector options={CHANNELS} value={channel} onChange={setChannel} />
        </View>

        {/* Contact result */}
        <View style={styles.field}>
          <Text style={styles.label}>Resultado de contacto *</Text>
          <ChipSelector options={CONTACT_RESULTS} value={contactResult} onChange={setContactResult} />
        </View>

        {/* Interest result — only if contacted */}
        {showInterest && (
          <View style={styles.field}>
            <Text style={styles.label}>Resultado de interés</Text>
            <ChipSelector options={INTEREST_RESULTS} value={interestResult} onChange={setInterestResult} />
          </View>
        )}

        {/* Rejection reason — only if not interested */}
        {showRejection && (
          <View style={styles.field}>
            <Text style={styles.label}>Motivo de rechazo</Text>
            <View style={styles.pickerRow}>
              {reasons.filter((r) => r.active).map((r) => (
                <Pressable
                  key={r.id}
                  style={[styles.chip, rejectionReasonId === r.id && styles.chipActive]}
                  onPress={() => setRejectionReasonId(r.id)}
                >
                  <Text style={[styles.chipText, rejectionReasonId === r.id && styles.chipTextActive]}>
                    {r.value}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Sale details — only if sale */}
        {showSaleDetails && (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Oferta</Text>
              <View style={styles.pickerRow}>
                {offers.map((o) => (
                  <Pressable
                    key={o.id}
                    style={[styles.chip, offerId === o.id && styles.chipActive]}
                    onPress={() => setOfferId(o.id)}
                  >
                    <Text style={[styles.chipText, offerId === o.id && styles.chipTextActive]}>
                      {o.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Medio de pago</Text>
              <TextInput
                style={styles.input}
                value={paymentMethod}
                onChangeText={setPaymentMethod}
                placeholder="Efectivo, tarjeta, transferencia..."
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Financiación</Text>
              <TextInput
                style={styles.input}
                value={financing}
                onChangeText={setFinancing}
                placeholder="Plan de cuotas..."
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, styles.flex]}>
                <Text style={styles.label}>N° Factura</Text>
                <TextInput
                  style={styles.input}
                  value={invoiceNumber}
                  onChangeText={setInvoiceNumber}
                  placeholder="Nro."
                  placeholderTextColor={colors.textDisabled}
                />
              </View>
              <View style={[styles.field, styles.flex]}>
                <Text style={styles.label}>Monto</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </>
        )}

        {/* Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>Notas</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Observaciones..."
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={3}
          />
        </View>

        {(error || storeError) && (
          <Text style={styles.errorText}>{error || storeError}</Text>
        )}

        <Pressable
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
          ) : (
            <Text style={styles.buttonText}>Registrar gestión</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[20] },
  field: { gap: spacing[1] },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
  input: {
    backgroundColor: colors.surface,
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
  row: { flexDirection: 'row', gap: spacing[3] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.textOnPrimary, fontWeight: fontWeight.semibold },
  moreText: { fontSize: fontSize.sm, color: colors.textDisabled, alignSelf: 'center' },
  errorText: { color: colors.error, fontSize: fontSize.sm },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: spacing[2],
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textOnPrimary },
});
