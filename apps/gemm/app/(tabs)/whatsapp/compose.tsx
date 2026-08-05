import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useProspectsStore } from '@/stores/prospectsStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/lib/dialog';
import type { EmailTemplate } from '@/types';
import {
  colors, fontSize, fontWeight, spacing, borderRadius, shadows,
} from '@/constants/theme';

export default function WhatsAppComposeScreen() {
  const {
    phone: prePhone,
    name: preName,
    prospectId: preProspectId,
  } = useLocalSearchParams<{ phone?: string; name?: string; prospectId?: string }>();

  const prospects = useProspectsStore((s) => s.prospects);
  const profile = useAuthStore((s) => s.profile);

  const prospect = preProspectId ? prospects.find((p) => p.id === preProspectId) : null;

  const [phone, setPhone] = useState(prePhone ?? '');
  const [body, setBody] = useState('');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    setPhone(prePhone ?? '');
    setBody('');
    setSelectedTemplate(null);
  }, [prePhone]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('email_templates')
        .select('*')
        .eq('channel', 'whatsapp')
        .order('name');
      setTemplates((data ?? []) as EmailTemplate[]);
      setLoadingTemplates(false);
    })();
  }, []);

  function interpolate(text: string): string {
    const vars: Record<string, string> = {
      prospectName: prospect?.name ?? preName ?? '',
      contactName: prospect?.contacts?.[0]?.name ?? preName ?? '',
      senderName: profile?.full_name ?? '',
    };
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
  }

  function applyTemplate(t: EmailTemplate) {
    setSelectedTemplate(t);
    setBody(interpolate(t.body));
  }

  async function handleOpen() {
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '').replace(/^0/, '');
    cleanPhone = cleanPhone.replace(/^(11|[2-9]\d{1,2})15(\d{8})$/, '$1$2');
    if (!cleanPhone.startsWith('549')) cleanPhone = '549' + cleanPhone;
    if (!cleanPhone || !body.trim()) {
      showAlert('Error', 'Completá el teléfono y el mensaje.');
      return;
    }
    if (preProspectId && prospect?.stage === 'lead') {
      useProspectsStore.getState().moveProspect(preProspectId, 'contacted');
    }
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(body.trim())}`;
    Linking.openURL(url);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <Text style={styles.label}>Teléfono <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="whatsapp" size={18} color="#25D366" />
            <TextInput
              style={styles.inputInner}
              value={phone}
              onChangeText={setPhone}
              placeholder="5491112345678"
              placeholderTextColor={colors.textDisabled}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Plantilla (opcional)</Text>
          {loadingTemplates ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[2] }} />
          ) : templates.length === 0 ? (
            <Text style={styles.emptyTemplates}>Sin plantillas de WhatsApp. Creá una en Correos → Plantillas.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <View style={styles.chipRow}>
                <Pressable
                  style={[styles.chip, !selectedTemplate && styles.chipSelected]}
                  onPress={() => { setSelectedTemplate(null); setBody(''); }}
                >
                  <Text style={[styles.chipText, !selectedTemplate && styles.chipTextSelected]}>
                    Texto libre
                  </Text>
                </Pressable>
                {templates.map((t) => (
                  <Pressable
                    key={t.id}
                    style={[styles.chip, selectedTemplate?.id === t.id && styles.chipSelected]}
                    onPress={() => applyTemplate(t)}
                  >
                    <Text style={[styles.chipText, selectedTemplate?.id === t.id && styles.chipTextSelected]}>
                      {t.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Mensaje <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.bodyInput}
            value={body}
            onChangeText={(v) => { setBody(v); setSelectedTemplate(null); }}
            placeholder="Escribí tu mensaje..."
            placeholderTextColor={colors.textDisabled}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{body.length} caracteres</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            pressed && styles.sendBtnPressed,
            (!phone.trim() || !body.trim()) && styles.sendBtnDisabled,
          ]}
          onPress={handleOpen}
          disabled={!phone.trim() || !body.trim()}
        >
          <MaterialCommunityIcons name="whatsapp" size={20} color="#fff" />
          <Text style={styles.sendBtnText}>Abrir en WhatsApp</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], gap: spacing[4] },

  field: { gap: spacing[1] },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  required: { color: colors.error },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surface,
  },
  inputInner: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },

  chipScroll: { marginTop: spacing[1] },
  chipRow: { flexDirection: 'row', gap: spacing[2], paddingVertical: 2 },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: '#25D366', backgroundColor: '#25D36615' },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary },
  chipTextSelected: { color: '#25D366', fontWeight: fontWeight.semibold },

  bodyInput: {
    minHeight: 160,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    fontSize: fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  charCount: { fontSize: fontSize.xs, color: colors.textDisabled, textAlign: 'right' },

  emptyTemplates: { fontSize: fontSize.sm, color: colors.textSecondary, fontStyle: 'italic' },

  sendBtn: {
    height: 56,
    backgroundColor: '#25D366',
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    ...shadows.subtle,
  },
  sendBtnPressed: { opacity: 0.85 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: fontSize.base, fontWeight: fontWeight.semibold },
});
