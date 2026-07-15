import { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEmailStore, type SendRecipient } from '@/stores/emailStore';
import { useProspectsStore } from '@/stores/prospectsStore';
import { useAuthStore } from '@/stores/authStore';
import { showAlert } from '@/lib/dialog';
import type { EmailTemplate, Prospect } from '@/types';
import { colors, fontSize, fontWeight, spacing, borderRadius, shadows } from '@/constants/theme';

// prospectId param: pre-selects a single prospect (from prospect detail)
export default function ComposeScreen() {
  const { prospectId: preselectedId } = useLocalSearchParams<{ prospectId?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const profile = useAuthStore((s) => s.profile);
  const templates = useEmailStore((s) => s.templates);
  const sending = useEmailStore((s) => s.sending);
  const fetchTemplates = useEmailStore((s) => s.fetchTemplates);
  const sendEmails = useEmailStore((s) => s.sendEmails);
  const prospects = useProspectsStore((s) => s.prospects);
  const fetchProspects = useProspectsStore((s) => s.fetchProspects);

  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateSheetVisible, setTemplateSheetVisible] = useState(false);

  // selections: prospectId → set of contact indices
  const [selections, setSelections] = useState<Map<string, Set<number>>>(new Map());
  // which prospects are expanded
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [previewVisible, setPreviewVisible] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Nuevo correo' });
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchProspects();
  }, []);

  // Pre-select prospect from params
  useEffect(() => {
    if (preselectedId) {
      setSelections(new Map([[preselectedId, new Set()]]));
      setExpanded(new Set([preselectedId]));
    }
  }, [preselectedId]);

  function toggleProspect(prospectId: string) {
    setSelections((prev) => {
      const next = new Map(prev);
      if (next.has(prospectId)) {
        next.delete(prospectId);
      } else {
        next.set(prospectId, new Set());
      }
      return next;
    });
  }

  function toggleContact(prospectId: string, idx: number) {
    setSelections((prev) => {
      const next = new Map(prev);
      const contacts = new Set(next.get(prospectId) ?? []);
      if (contacts.has(idx)) contacts.delete(idx);
      else contacts.add(idx);
      next.set(prospectId, contacts);
      return next;
    });
  }

  function toggleExpanded(prospectId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(prospectId)) next.delete(prospectId);
      else next.add(prospectId);
      return next;
    });
  }

  function buildRecipients(): SendRecipient[] {
    const senderName = profile?.full_name ?? '';
    const recipients: SendRecipient[] = [];

    for (const [prospectId, contactIndices] of selections) {
      const prospect = prospects.find((p) => p.id === prospectId);
      if (!prospect) continue;

      const emailableContacts = (prospect.contacts ?? [])
        .map((c, i) => ({ ...c, i }))
        .filter((c) => c.email);

      if (contactIndices.size === 0) {
        // No specific contact selected — use all contacts with email
        for (const c of emailableContacts) {
          recipients.push({
            email: c.email!,
            name: c.name,
            prospectId,
            variables: {
              prospectName: prospect.name,
              contactName: c.name ?? '',
              senderName,
            },
          });
        }
      } else {
        for (const idx of contactIndices) {
          const c = prospect.contacts?.[idx];
          if (!c?.email) continue;
          recipients.push({
            email: c.email,
            name: c.name,
            prospectId,
            variables: {
              prospectName: prospect.name,
              contactName: c.name ?? '',
              senderName,
            },
          });
        }
      }
    }

    return recipients;
  }

  function renderPreview(): { subject: string; body: string } | null {
    if (!selectedTemplate) return null;
    const recipients = buildRecipients();
    if (recipients.length === 0) return null;
    const vars = recipients[0].variables;
    const render = (s: string) =>
      s.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
    return { subject: render(selectedTemplate.subject), body: render(selectedTemplate.body) };
  }

  async function handleSend() {
    if (!selectedTemplate) {
      showAlert('Falta plantilla', 'Seleccioná una plantilla antes de enviar.');
      return;
    }
    const recipients = buildRecipients();
    if (recipients.length === 0) {
      showAlert('Sin destinatarios', 'Seleccioná al menos un prospecto con email.');
      return;
    }

    const { sent, failed } = await sendEmails(selectedTemplate.id, recipients);

    if (failed === 0) {
      showAlert('Enviado', `${sent} correo${sent !== 1 ? 's' : ''} enviado${sent !== 1 ? 's' : ''} correctamente.`);
    } else {
      showAlert('Resultado', `Enviados: ${sent}  ·  Fallidos: ${failed}`);
    }
    router.back();
  }

  const recipientCount = buildRecipients().length;
  const preview = previewVisible ? renderPreview() : null;

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[8] }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Template ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PLANTILLA</Text>
          <Pressable
            style={({ pressed }) => [styles.templatePicker, pressed && { opacity: 0.75 }]}
            onPress={() => setTemplateSheetVisible(true)}
          >
            {selectedTemplate ? (
              <View style={styles.templatePickerContent}>
                <MaterialCommunityIcons name="email-outline" size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.templateName}>{selectedTemplate.name}</Text>
                  <Text style={styles.templateSubject} numberOfLines={1}>{selectedTemplate.subject}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.templatePickerContent}>
                <MaterialCommunityIcons name="email-outline" size={18} color={colors.textDisabled} />
                <Text style={styles.templatePlaceholder}>Seleccionar plantilla…</Text>
              </View>
            )}
            <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* ── Prospects ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DESTINATARIOS</Text>
          {prospects.length === 0 ? (
            <Text style={styles.empty}>Sin prospectos cargados</Text>
          ) : (
            prospects.map((p) => (
              <ProspectRow
                key={p.id}
                prospect={p}
                selected={selections.has(p.id)}
                expanded={expanded.has(p.id)}
                selectedContacts={selections.get(p.id) ?? new Set()}
                onToggleSelect={() => toggleProspect(p.id)}
                onToggleExpand={() => toggleExpanded(p.id)}
                onToggleContact={(idx) => toggleContact(p.id, idx)}
              />
            ))
          )}
        </View>

        {/* ── Actions ───────────────────────────────────────────── */}
        {recipientCount > 0 && selectedTemplate && (
          <Pressable
            style={styles.previewBtn}
            onPress={() => setPreviewVisible(true)}
          >
            <MaterialCommunityIcons name="eye-outline" size={16} color={colors.primary} />
            <Text style={styles.previewBtnText}>
              Vista previa ({recipientCount} destinatario{recipientCount !== 1 ? 's' : ''})
            </Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            pressed && { opacity: 0.85 },
            (!selectedTemplate || recipientCount === 0 || sending) && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!selectedTemplate || recipientCount === 0 || sending}
        >
          {sending ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <>
              <MaterialCommunityIcons name="send" size={18} color={colors.textOnPrimary} />
              <Text style={styles.sendBtnText}>
                {recipientCount > 0
                  ? `Enviar a ${recipientCount} destinatario${recipientCount !== 1 ? 's' : ''}`
                  : 'Enviar'}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* ── Template picker sheet ─────────────────────────────── */}
      <Modal
        visible={templateSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTemplateSheetVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setTemplateSheetVisible(false)}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing[4] }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Elegir plantilla</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {templates.length === 0 ? (
                <Text style={styles.empty}>Sin plantillas. Creá una en Configuración.</Text>
              ) : (
                templates.map((t) => (
                  <Pressable
                    key={t.id}
                    style={[
                      styles.templateOption,
                      selectedTemplate?.id === t.id && styles.templateOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedTemplate(t);
                      setTemplateSheetVisible(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.templateOptionName}>{t.name}</Text>
                      <Text style={styles.templateOptionSubject} numberOfLines={1}>{t.subject}</Text>
                    </View>
                    {selectedTemplate?.id === t.id && (
                      <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                    )}
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ── Preview modal ─────────────────────────────────────── */}
      <Modal
        visible={previewVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setPreviewVisible(false)}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing[4] }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Vista previa</Text>
            {preview ? (
              <ScrollView style={{ maxHeight: 360 }}>
                <Text style={styles.previewLabel}>Asunto</Text>
                <Text style={styles.previewSubject}>{preview.subject}</Text>
                <Text style={[styles.previewLabel, { marginTop: spacing[3] }]}>Cuerpo</Text>
                <Text style={styles.previewBody}>{preview.body}</Text>
              </ScrollView>
            ) : null}
            <Pressable
              style={[styles.sendBtn, { marginTop: spacing[3] }]}
              onPress={() => setPreviewVisible(false)}
            >
              <Text style={styles.sendBtnText}>Cerrar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ── ProspectRow ───────────────────────────────────────────────────────────────

function ProspectRow({
  prospect,
  selected,
  expanded,
  selectedContacts,
  onToggleSelect,
  onToggleExpand,
  onToggleContact,
}: {
  prospect: Prospect;
  selected: boolean;
  expanded: boolean;
  selectedContacts: Set<number>;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onToggleContact: (idx: number) => void;
}) {
  const emailableContacts = (prospect.contacts ?? []).filter((c) => c.email);
  const hasContacts = emailableContacts.length > 0;

  return (
    <View style={styles.prospectCard}>
      <Pressable style={styles.prospectRow} onPress={onToggleSelect}>
        <MaterialCommunityIcons
          name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={22}
          color={selected ? colors.primary : colors.textDisabled}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.prospectName}>{prospect.name}</Text>
          {hasContacts ? (
            <Text style={styles.prospectSub}>{emailableContacts.length} contacto{emailableContacts.length !== 1 ? 's' : ''} con email</Text>
          ) : (
            <Text style={[styles.prospectSub, { color: colors.warning }]}>Sin email</Text>
          )}
        </View>
        {selected && hasContacts && (
          <Pressable onPress={onToggleExpand} hitSlop={8}>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
      </Pressable>

      {selected && expanded && hasContacts && (
        <View style={styles.contactList}>
          {prospect.contacts.map((c, idx) => {
            if (!c.email) return null;
            const checked = selectedContacts.has(idx);
            return (
              <Pressable key={idx} style={styles.contactRow} onPress={() => onToggleContact(idx)}>
                <MaterialCommunityIcons
                  name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={18}
                  color={checked ? colors.primary : colors.textDisabled}
                />
                <View style={{ flex: 1 }}>
                  {c.name ? <Text style={styles.contactName}>{c.name}</Text> : null}
                  <Text style={styles.contactEmail}>{c.email}</Text>
                </View>
              </Pressable>
            );
          })}
          <Text style={styles.contactHint}>
            {selectedContacts.size === 0
              ? 'Sin selección → se envía a todos los contactos con email'
              : `${selectedContacts.size} seleccionado${selectedContacts.size !== 1 ? 's' : ''}`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], gap: spacing[4] },
  section: { gap: spacing[2] },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    paddingHorizontal: spacing[1],
  },
  // Template picker
  templatePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
    ...shadows.subtle,
  },
  templatePickerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  templateName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  templateSubject: { fontSize: fontSize.sm, color: colors.textSecondary },
  templatePlaceholder: { fontSize: fontSize.base, color: colors.textDisabled },
  // Prospect list
  prospectCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  prospectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    gap: spacing[3],
  },
  prospectName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  prospectSub: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },
  contactList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing[3],
    gap: spacing[2],
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  contactName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textPrimary },
  contactEmail: { fontSize: fontSize.xs, color: colors.textSecondary },
  contactHint: { fontSize: fontSize.xs, color: colors.textDisabled, marginTop: spacing[1] },
  // Preview
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  previewBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.primary },
  // Send
  sendBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: colors.textOnPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[3],
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
  },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  templateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },
  templateOptionActive: { backgroundColor: colors.primaryLight },
  templateOptionName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  templateOptionSubject: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 1 },
  previewLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewSubject: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginTop: spacing[1] },
  previewBody: { fontSize: fontSize.sm, color: colors.textPrimary, lineHeight: 20, marginTop: spacing[1] },
  empty: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', padding: spacing[4] },
});
