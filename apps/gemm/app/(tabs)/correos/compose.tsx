import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchableSelect } from '@crm/core';

import { useEmailStore, type SendRecipient } from '@/stores/emailStore';
import { useProspectsStore } from '@/stores/prospectsStore';
import { useAuthStore } from '@/stores/authStore';
import { showAlert } from '@/lib/dialog';
import type { EmailTemplate, Prospect } from '@/types';
import { colors, fontSize, fontWeight, spacing, borderRadius, shadows } from '@/constants/theme';

const normalizeRubro = (industry: string | null | undefined): string | null => {
  if (!industry) return null;
  return industry.split('(')[0].trim() || null;
};

// prospectId param: pre-selects a single prospect (from prospect detail)
export default function ComposeScreen() {
  const { prospectId: preselectedId } = useLocalSearchParams<{ prospectId?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const profile = useAuthStore((s) => s.profile);
  const allTemplates = useEmailStore((s) => s.templates);
  const templates = allTemplates.filter((t) => t.channel !== 'whatsapp');
  const sending = useEmailStore((s) => s.sending);
  const fetchTemplates = useEmailStore((s) => s.fetchTemplates);
  const sendEmails = useEmailStore((s) => s.sendEmails);
  const signatures = useEmailStore((s) => s.signatures);
  const fetchSignatures = useEmailStore((s) => s.fetchSignatures);
  const prospects = useProspectsStore((s) => s.prospects);
  const fetchProspects = useProspectsStore((s) => s.fetchProspects);

  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [freeSubject, setFreeSubject] = useState('');
  const [freeBody, setFreeBody] = useState('');
  const isFreeText = !selectedTemplate;
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);

  // selections: prospectId → set of contact indices
  const [selections, setSelections] = useState<Map<string, Set<number>>>(new Map());
  // which prospects are expanded
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [previewVisible, setPreviewVisible] = useState(false);

  // ── Search + filters ───────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [selectedRubros, setSelectedRubros] = useState<string[]>([]);
  const [selectedSubrubros, setSelectedSubrubros] = useState<string[]>([]);
  const filtersLoaded = useRef(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Nuevo correo' });
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchProspects();
    fetchSignatures().then(() => {
      const def = useEmailStore.getState().signatures.find((s) => s.is_default);
      if (def) setSelectedSignatureId(def.id);
    });
    AsyncStorage.getItem('compose_filters').then((raw) => {
      if (!raw) { filtersLoaded.current = true; return; }
      try {
        const f = JSON.parse(raw);
        if (f.rubros) setSelectedRubros(f.rubros);
        if (f.subrubros) setSelectedSubrubros(f.subrubros);
      } catch {}
      filtersLoaded.current = true;
    });
  }, []);

  const saveFilters = useCallback((rubros: string[], subrubros: string[]) => {
    if (!filtersLoaded.current) return;
    AsyncStorage.setItem('compose_filters', JSON.stringify({ rubros, subrubros }));
  }, []);

  const rubroOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of prospects) {
      const r = normalizeRubro(p.industry);
      if (r) set.add(r);
    }
    return [...set].sort();
  }, [prospects]);

  const byRubro = useMemo(
    () =>
      selectedRubros.length > 0
        ? prospects.filter((p) => {
            const r = normalizeRubro(p.industry);
            return r !== null && selectedRubros.includes(r);
          })
        : prospects,
    [prospects, selectedRubros]
  );

  const subrubroOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of byRubro) {
      if (p.subindustry) set.add(p.subindustry);
    }
    return [...set].sort();
  }, [byRubro]);

  const filteredProspects = useMemo(() => {
    let list = selectedSubrubros.length > 0
      ? byRubro.filter((p) => p.subindustry != null && selectedSubrubros.includes(p.subindustry))
      : byRubro;
    list = list.filter((p) => p.contacts?.some((c) => c.email));
    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.contacts?.some((c) => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [byRubro, selectedSubrubros, searchText]);

  const handleRubrosChange = (rubros: string[]) => {
    setSelectedRubros(rubros);
    const subs = rubros.length === 0 ? [] : selectedSubrubros;
    if (rubros.length === 0) setSelectedSubrubros([]);
    saveFilters(rubros, subs);
  };

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
    const subj = selectedTemplate ? selectedTemplate.subject : freeSubject;
    const bod = selectedTemplate ? selectedTemplate.body : freeBody;
    if (!subj || !bod) return null;
    const recipients = buildRecipients();
    if (recipients.length === 0) return null;
    const vars = recipients[0].variables;
    const render = (s: string) =>
      s.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
    return { subject: render(subj), body: render(bod) };
  }

  async function handleSend() {
    if (!selectedTemplate && (!freeSubject.trim() || !freeBody.trim())) {
      showAlert('Faltan datos', 'Elegí una plantilla o completá asunto y mensaje.');
      return;
    }
    const recipients = buildRecipients();
    if (recipients.length === 0) {
      showAlert('Sin destinatarios', 'Seleccioná al menos un prospecto con email.');
      return;
    }

    const opts = selectedTemplate
      ? { templateId: selectedTemplate.id, signatureId: selectedSignatureId ?? undefined }
      : { subject: freeSubject.trim(), body: freeBody.trim(), signatureId: selectedSignatureId ?? undefined };
    const { sent, failed } = await sendEmails(opts, recipients);

    if (sent > 0) {
      const moveProspect = useProspectsStore.getState().moveProspect;
      for (const r of recipients) {
        if (r.prospectId) {
          const p = prospects.find((pr) => pr.id === r.prospectId);
          if (p?.stage === 'lead') moveProspect(r.prospectId, 'contacted');
        }
      }
    }

    if (failed === 0) {
      showAlert('Enviado', `${sent} correo${sent !== 1 ? 's' : ''} enviado${sent !== 1 ? 's' : ''} correctamente.`);
    } else {
      showAlert('Resultado', `Enviados: ${sent}  ·  Fallidos: ${failed}`);
    }
    router.back();
  }

  const recipientCount = buildRecipients().length;
  const hasContent = selectedTemplate ? true : (freeSubject.trim().length > 0 && freeBody.trim().length > 0);
  const preview = previewVisible ? renderPreview() : null;

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[8] }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Template / Free text toggle ────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MENSAJE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              <Pressable
                style={[styles.chip, isFreeText && styles.chipSelected]}
                onPress={() => setSelectedTemplate(null)}
              >
                <Text style={[styles.chipText, isFreeText && styles.chipTextSelected]}>Texto libre</Text>
              </Pressable>
              {templates.map((t) => (
                <Pressable
                  key={t.id}
                  style={[styles.chip, selectedTemplate?.id === t.id && styles.chipSelected]}
                  onPress={() => setSelectedTemplate(t)}
                >
                  <Text style={[styles.chipText, selectedTemplate?.id === t.id && styles.chipTextSelected]}>{t.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {isFreeText ? (
            <View style={styles.freeTextFields}>
              <TextInput
                style={styles.freeInput}
                value={freeSubject}
                onChangeText={setFreeSubject}
                placeholder="Asunto"
                placeholderTextColor={colors.textDisabled}
              />
              <TextInput
                style={[styles.freeInput, styles.freeBody]}
                value={freeBody}
                onChangeText={setFreeBody}
                placeholder="Cuerpo del mensaje..."
                placeholderTextColor={colors.textDisabled}
                multiline
                textAlignVertical="top"
              />
            </View>
          ) : (
            <View style={styles.templatePreviewBox}>
              <Text style={styles.templatePreviewLabel}>Asunto</Text>
              <Text style={styles.templatePreviewValue}>{selectedTemplate?.subject}</Text>
              <Text style={[styles.templatePreviewLabel, { marginTop: spacing[2] }]}>Cuerpo</Text>
              <Text style={styles.templatePreviewValue} numberOfLines={4}>{selectedTemplate?.body}</Text>
            </View>
          )}
        </View>

        {/* ── Signature ─────────────────────────────────────────── */}
        {signatures.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FIRMA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                <Pressable
                  style={[styles.chip, !selectedSignatureId && styles.chipSelected]}
                  onPress={() => setSelectedSignatureId(null)}
                >
                  <Text style={[styles.chipText, !selectedSignatureId && styles.chipTextSelected]}>Sin firma</Text>
                </Pressable>
                {signatures.map((s) => (
                  <Pressable
                    key={s.id}
                    style={[styles.chip, selectedSignatureId === s.id && styles.chipSelected]}
                    onPress={() => setSelectedSignatureId(s.id)}
                  >
                    <Text style={[styles.chipText, selectedSignatureId === s.id && styles.chipTextSelected]}>{s.name}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── Prospects ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DESTINATARIOS</Text>

          {/* Search + filters */}
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Buscar prospecto..."
              placeholderTextColor={colors.textDisabled}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchText.length > 0 && (
              <Pressable onPress={() => setSearchText('')} hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          <View style={styles.filterRow}>
            {rubroOptions.length > 0 && (
              <View style={styles.filterItem}>
                <SearchableSelect
                  label="Rubro"
                  options={rubroOptions}
                  selected={selectedRubros}
                  onChange={handleRubrosChange}
                  multiple
                  placeholder="Filtrar rubro"
                />
              </View>
            )}
            {selectedRubros.length > 0 && subrubroOptions.length > 0 && (
              <View style={styles.filterItem}>
                <SearchableSelect
                  label="Subrubro"
                  options={subrubroOptions}
                  selected={selectedSubrubros}
                  onChange={(subs: string[]) => { setSelectedSubrubros(subs); saveFilters(selectedRubros, subs); }}
                  multiple
                  placeholder="Filtrar subrubro"
                />
              </View>
            )}
          </View>

          {filteredProspects.length === 0 ? (
            <Text style={styles.empty}>
              {prospects.length === 0 ? 'Sin prospectos cargados' : 'Sin resultados'}
            </Text>
          ) : (
            filteredProspects.map((p) => (
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
        {recipientCount > 0 && hasContent && (
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
            (!hasContent || recipientCount === 0 || sending) && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!hasContent || recipientCount === 0 || sending}
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
  // Chips
  chipRow: { flexDirection: 'row', gap: spacing[2], paddingVertical: 2 },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary },
  chipTextSelected: { color: colors.primary, fontWeight: fontWeight.semibold },
  // Free text
  freeTextFields: { gap: spacing[2], marginTop: spacing[1] },
  freeInput: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  freeBody: { height: 160, paddingTop: spacing[3] },
  // Template preview
  templatePreviewBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginTop: spacing[1],
  },
  templatePreviewLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textSecondary, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  templatePreviewValue: { fontSize: fontSize.sm, color: colors.textPrimary, marginTop: 2 },
  // Search + filters
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    height: 44,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  filterItem: {
    flex: 1,
  },
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
