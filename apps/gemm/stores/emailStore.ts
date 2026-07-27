import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { EmailTemplate, EmailSend, EmailSignature } from '@/types';

export interface SendRecipient {
  email: string;
  name?: string;
  prospectId?: string;
  variables: Record<string, string>;
}

interface EmailState {
  templates: EmailTemplate[];
  sends: EmailSend[];
  prospectSends: Record<string, EmailSend[]>;
  signatures: EmailSignature[];
  loading: boolean;
  sending: boolean;
  error: string | null;

  fetchTemplates: () => Promise<void>;
  fetchSends: () => Promise<void>;
  fetchProspectSends: (prospectId: string) => Promise<void>;
  createTemplate: (data: Pick<EmailTemplate, 'name' | 'subject' | 'body'> & { channel?: 'email' | 'whatsapp' }) => Promise<EmailTemplate | null>;
  updateTemplate: (id: string, data: Partial<Pick<EmailTemplate, 'name' | 'subject' | 'body'> & { channel?: 'email' | 'whatsapp' }>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  fetchSignatures: () => Promise<void>;
  createSignature: (data: Pick<EmailSignature, 'name' | 'body_html'> & { is_default?: boolean }) => Promise<EmailSignature | null>;
  updateSignature: (id: string, data: Partial<Pick<EmailSignature, 'name' | 'body_html' | 'is_default'>>) => Promise<void>;
  deleteSignature: (id: string) => Promise<void>;
  setDefaultSignature: (id: string) => Promise<void>;
  sendEmails: (opts: { templateId?: string; subject?: string; body?: string; signatureId?: string }, recipients: SendRecipient[]) => Promise<{ sent: number; failed: number }>;
}

export const useEmailStore = create<EmailState>((set, get) => ({
  templates: [],
  sends: [],
  prospectSends: {},
  signatures: [],
  loading: false,
  sending: false,
  error: null,

  fetchTemplates: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('name');
    if (error) { set({ error: error.message, loading: false }); return; }
    set({ templates: data ?? [], loading: false });
  },

  fetchSends: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('email_sends')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) { set({ error: error.message, loading: false }); return; }
    set({ sends: data ?? [], loading: false });
  },

  fetchProspectSends: async (prospectId: string) => {
    const { data, error } = await supabase
      .from('email_sends')
      .select('*')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false });
    if (error) return;
    set((s) => ({ prospectSends: { ...s.prospectSends, [prospectId]: data ?? [] } }));
  },

  createTemplate: async (data) => {
    const userId = useAuthStore.getState().session?.user?.id;
    const profile = useAuthStore.getState().profile;
    if (!userId || !profile?.company_id) return null;

    const { data: created, error } = await supabase
      .from('email_templates')
      .insert({ ...data, created_by: userId, company_id: profile.company_id })
      .select()
      .single();

    if (error || !created) return null;
    set((s) => ({ templates: [...s.templates, created].sort((a, b) => a.name.localeCompare(b.name)) }));
    return created;
  },

  updateTemplate: async (id, data) => {
    const { data: updated, error } = await supabase
      .from('email_templates')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error || !updated) return;
    set((s) => ({
      templates: s.templates
        .map((t) => (t.id === id ? updated : t))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  },

  deleteTemplate: async (id) => {
    const { error } = await supabase.from('email_templates').delete().eq('id', id);
    if (error) return;
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));
  },

  fetchSignatures: async () => {
    const { data } = await supabase
      .from('email_signatures')
      .select('*')
      .order('name');
    set({ signatures: (data ?? []) as EmailSignature[] });
  },

  createSignature: async (data) => {
    const userId = useAuthStore.getState().session?.user?.id;
    const profile = useAuthStore.getState().profile;
    if (!userId || !profile?.company_id) return null;

    if (data.is_default) {
      await supabase
        .from('email_signatures')
        .update({ is_default: false })
        .eq('company_id', profile.company_id);
    }

    const { data: created, error } = await supabase
      .from('email_signatures')
      .insert({ ...data, created_by: userId, company_id: profile.company_id })
      .select()
      .single();

    if (error || !created) return null;
    if (data.is_default) {
      set((s) => ({
        signatures: [...s.signatures.map((sg) => ({ ...sg, is_default: false })), created]
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));
    } else {
      set((s) => ({ signatures: [...s.signatures, created].sort((a, b) => a.name.localeCompare(b.name)) }));
    }
    return created as EmailSignature;
  },

  updateSignature: async (id, data) => {
    const { data: updated, error } = await supabase
      .from('email_signatures')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error || !updated) return;
    set((s) => ({
      signatures: s.signatures
        .map((sg) => (sg.id === id ? (updated as EmailSignature) : sg))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  },

  deleteSignature: async (id) => {
    const { error } = await supabase.from('email_signatures').delete().eq('id', id);
    if (error) return;
    set((s) => ({ signatures: s.signatures.filter((sg) => sg.id !== id) }));
  },

  setDefaultSignature: async (id) => {
    const profile = useAuthStore.getState().profile;
    if (!profile?.company_id) return;
    await supabase
      .from('email_signatures')
      .update({ is_default: false })
      .eq('company_id', profile.company_id);
    await supabase
      .from('email_signatures')
      .update({ is_default: true })
      .eq('id', id);
    set((s) => ({
      signatures: s.signatures.map((sg) => ({ ...sg, is_default: sg.id === id })),
    }));
  },

  sendEmails: async (opts, recipients) => {
    set({ sending: true });
    const session = useAuthStore.getState().session;
    if (!session) { set({ sending: false }); return { sent: 0, failed: recipients.length }; }

    const { data, error } = await supabase.functions.invoke('send-prospect-email', {
      body: { ...opts, recipients },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    set({ sending: false });

    if (error) return { sent: 0, failed: recipients.length };

    const result = data as { sent: number; failed: number };

    // Refresh sends list in background
    get().fetchSends();

    return result;
  },
}));
