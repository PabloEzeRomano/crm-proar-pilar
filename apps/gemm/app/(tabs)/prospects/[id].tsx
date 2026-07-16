import { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProspectsStore } from '@/stores/prospectsStore';
import { useEmailStore } from '@/stores/emailStore';
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  PRODUCT_LABELS,
  INTERACTION_LABELS,
  type InteractionType,
  type ProspectStage,
} from '@/types';
import {
  colors,
  stageColors,
  productColors,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  shadows,
} from '@/constants/theme';
import dayjs from '@/lib/dayjs';
import { showConfirm } from '@/lib/dialog';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const EMPTY: never[] = [];

const INTERACTION_ICONS: Record<InteractionType, IconName> = {
  note: 'note-text-outline',
  call: 'phone-outline',
  email: 'email-outline',
};

export default function ProspectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const prospect = useProspectsStore((s) => s.prospects.find((p) => p.id === id));
  const interactions = useProspectsStore((s) => s.interactions[id] ?? EMPTY);
  const fetchInteractions = useProspectsStore((s) => s.fetchInteractions);
  const moveProspect = useProspectsStore((s) => s.moveProspect);
  const addInteraction = useProspectsStore((s) => s.addInteraction);
  const deleteProspect = useProspectsStore((s) => s.deleteProspect);

  const emailSends = useEmailStore((s) => s.prospectSends[id] ?? EMPTY);
  const fetchProspectSends = useEmailStore((s) => s.fetchProspectSends);

  const [addingInteraction, setAddingInteraction] = useState(false);
  const [interactionType, setInteractionType] = useState<InteractionType>('note');
  const [interactionBody, setInteractionBody] = useState('');
  const [savingInteraction, setSavingInteraction] = useState(false);

  const [stageSheetVisible, setStageSheetVisible] = useState(false);

  useEffect(() => {
    if (id) {
      fetchInteractions(id);
      fetchProspectSends(id);
    }
  }, [id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={handleDelete}
          style={styles.headerBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.error} />
        </Pressable>
      ),
      title: prospect?.name ?? 'Prospecto',
    });
  }, [prospect?.name]);

  async function handleDelete() {
    const ok = await showConfirm({
      title: 'Eliminar prospecto',
      message: '¿Eliminar este prospecto y todas sus interacciones?',
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    await deleteProspect(id);
    router.back();
  }

  async function handleStageChange(stage: ProspectStage) {
    setStageSheetVisible(false);
    await moveProspect(id, stage);
  }

  async function handleSaveInteraction() {
    if (!interactionBody.trim()) return;
    setSavingInteraction(true);
    await addInteraction({
      prospect_id: id,
      type: interactionType,
      body: interactionBody.trim(),
    });
    setSavingInteraction(false);
    setInteractionBody('');
    setAddingInteraction(false);
  }

  if (!prospect) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const sc = stageColors[prospect.stage];
  const pc = productColors[prospect.product];

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[8] }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={styles.headerCardTop}>
            <Text style={styles.prospectName}>{prospect.name}</Text>
            <Pressable
              style={[styles.stagePill, { backgroundColor: sc.bg, borderColor: sc.border }]}
              onPress={() => setStageSheetVisible(true)}
            >
              <View style={[styles.stageDot, { backgroundColor: sc.text }]} />
              <Text style={[styles.stageText, { color: sc.text }]}>
                {STAGE_LABELS[prospect.stage]}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color={sc.text} />
            </Pressable>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: pc.bg }]}>
              <Text style={[styles.badgeText, { color: pc.text }]}>
                {PRODUCT_LABELS[prospect.product]}
              </Text>
            </View>
            {prospect.industry ? (
              <Text style={styles.metaText}>{prospect.industry}</Text>
            ) : null}
          </View>

          {(prospect.address || prospect.zone || prospect.cuit) ? (
            <View style={styles.locationRow}>
              {prospect.address ? (
                <Text style={styles.locationText} numberOfLines={1}>{prospect.address}</Text>
              ) : null}
              {prospect.zone ? (
                <Text style={styles.locationSep}> · </Text>
              ) : null}
              {prospect.zone ? (
                <Text style={styles.locationText}>{prospect.zone}</Text>
              ) : null}
              {prospect.cuit ? (
                <Text style={styles.locationText}> · CUIT {prospect.cuit}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Contacts */}
        {prospect.contacts && prospect.contacts.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contactos</Text>
            <View style={styles.card}>
              {prospect.contacts.map((c, idx) => (
                <View key={idx} style={[styles.contactBlock, idx > 0 && styles.contactDivider]}>
                  {c.name ? (
                    <Text style={styles.contactName}>{c.name}</Text>
                  ) : null}
                  {c.phone ? (
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="phone-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.infoText}>{c.phone}</Text>
                    </View>
                  ) : null}
                  {c.email ? (
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="email-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.infoText}>{c.email}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Follow-up */}
        {prospect.next_follow_up ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Próximo seguimiento</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-clock" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>
                  {dayjs(prospect.next_follow_up).format('DD/MM/YYYY HH:mm')}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Notes */}
        {prospect.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <View style={styles.card}>
              <Text style={styles.notesText}>{prospect.notes}</Text>
            </View>
          </View>
        ) : null}

        {/* Edit button */}
        <Pressable
          style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}
          onPress={() => router.push({ pathname: '/(tabs)/prospects/form', params: { id } } as any)}
        >
          <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.primary} />
          <Text style={styles.editBtnText}>Editar prospecto</Text>
        </Pressable>

        {/* Send email button */}
        <Pressable
          style={({ pressed }) => [styles.emailBtn, pressed && styles.editBtnPressed]}
          onPress={() =>
            router.push({ pathname: '/(tabs)/correos/compose', params: { prospectId: id } } as any)
          }
        >
          <MaterialCommunityIcons name="email-arrow-right-outline" size={16} color={colors.textOnPrimary} />
          <Text style={styles.emailBtnText}>Enviar correo</Text>
        </Pressable>

        {/* Email history */}
        {emailSends.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Correos enviados</Text>
            {emailSends.map((s) => (
              <View key={s.id} style={styles.interactionItem}>
                <View style={styles.interactionHeader}>
                  <View style={[styles.emailStatusDot, { backgroundColor: s.status === 'sent' ? colors.success : colors.error }]} />
                  <Text style={styles.interactionType}>{s.template_name}</Text>
                  <Text style={styles.interactionDate}>{dayjs(s.created_at).format('DD/MM HH:mm')}</Text>
                </View>
                <Text style={styles.interactionBody}>
                  Para: {s.recipient_name ? `${s.recipient_name} <${s.recipient_email}>` : s.recipient_email}
                </Text>
                <Text style={[styles.interactionBody, { color: colors.textSecondary }]} numberOfLines={1}>
                  {s.subject}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Interactions */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Interacciones</Text>
            <Pressable
              style={styles.addBtn}
              onPress={() => setAddingInteraction(true)}
            >
              <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
              <Text style={styles.addBtnText}>Agregar</Text>
            </Pressable>
          </View>

          {interactions.length === 0 ? (
            <Text style={styles.empty}>Sin interacciones todavía</Text>
          ) : (
            interactions.map((i) => (
              <View key={i.id} style={styles.interactionItem}>
                <View style={styles.interactionHeader}>
                  <MaterialCommunityIcons
                    name={INTERACTION_ICONS[i.type]}
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.interactionType}>
                    {INTERACTION_LABELS[i.type]}
                  </Text>
                  <Text style={styles.interactionDate}>
                    {dayjs(i.created_at).format('DD/MM HH:mm')}
                  </Text>
                </View>
                <Text style={styles.interactionBody}>{i.body}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add interaction modal */}
      <Modal
        visible={addingInteraction}
        transparent
        animationType="slide"
        onRequestClose={() => setAddingInteraction(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setAddingInteraction(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Nueva interacción</Text>

              {/* Type selector */}
              <View style={styles.typeRow}>
                {(['note', 'call', 'email'] as InteractionType[]).map((t) => (
                  <Pressable
                    key={t}
                    style={[
                      styles.typeBtn,
                      interactionType === t && styles.typeBtnActive,
                    ]}
                    onPress={() => setInteractionType(t)}
                  >
                    <MaterialCommunityIcons
                      name={INTERACTION_ICONS[t]}
                      size={16}
                      color={interactionType === t ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeBtnText,
                        interactionType === t && styles.typeBtnTextActive,
                      ]}
                    >
                      {INTERACTION_LABELS[t]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                style={styles.bodyInput}
                value={interactionBody}
                onChangeText={setInteractionBody}
                placeholder="Escribí tu nota..."
                placeholderTextColor={colors.textDisabled}
                multiline
                autoFocus
              />

              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  pressed && styles.saveBtnPressed,
                  !interactionBody.trim() && styles.saveBtnDisabled,
                ]}
                onPress={handleSaveInteraction}
                disabled={savingInteraction || !interactionBody.trim()}
              >
                {savingInteraction ? (
                  <ActivityIndicator color={colors.textOnPrimary} />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar</Text>
                )}
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Stage change sheet */}
      <Modal
        visible={stageSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStageSheetVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setStageSheetVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Mover a etapa</Text>
            {PIPELINE_STAGES.map((stage) => {
              const sc = stageColors[stage];
              const isActive = prospect.stage === stage;
              return (
                <Pressable
                  key={stage}
                  style={[styles.stageOption, isActive && styles.stageOptionActive]}
                  onPress={() => handleStageChange(stage)}
                >
                  <View style={[styles.stageDot, { backgroundColor: sc.text }]} />
                  <Text style={[styles.stageOptionText, { color: sc.text }]}>
                    {STAGE_LABELS[stage]}
                  </Text>
                  {isActive ? (
                    <MaterialCommunityIcons name="check" size={18} color={sc.text} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], gap: spacing[4] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    ...shadows.subtle,
  },
  headerCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  prospectName: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  stagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  stageDot: { width: 6, height: 6, borderRadius: borderRadius.full },
  stageText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  badge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  metaText: { fontSize: fontSize.sm, color: colors.textSecondary },
  locationRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: spacing[1] },
  locationText: { fontSize: fontSize.xs, color: colors.textSecondary },
  locationSep: { fontSize: fontSize.xs, color: colors.textDisabled },
  contactBlock: { gap: 4 },
  contactDivider: { marginTop: spacing[2], paddingTop: spacing[2], borderTopWidth: 1, borderTopColor: colors.border },
  contactName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  section: { gap: spacing[2] },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
    ...shadows.subtle,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  infoText: { fontSize: fontSize.base, color: colors.textPrimary },
  notesText: { fontSize: fontSize.base, color: colors.textPrimary, lineHeight: 22 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  editBtnPressed: { opacity: 0.7 },
  editBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  emailBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textOnPrimary,
  },
  emailStatusDot: {
    width: 7,
    height: 7,
    borderRadius: borderRadius.full,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
  },
  addBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  interactionItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    ...shadows.subtle,
  },
  interactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  interactionType: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  interactionDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  interactionBody: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  headerBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: { justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[3],
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing[2],
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  typeRow: { flexDirection: 'row', gap: spacing[2] },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  typeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeBtnText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  typeBtnTextActive: { color: colors.primary },
  bodyInput: {
    minHeight: 100,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[3],
    fontSize: fontSize.base,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  saveBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  // Stage sheet
  stageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.md,
  },
  stageOptionActive: { backgroundColor: colors.background },
  stageOptionText: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
});
