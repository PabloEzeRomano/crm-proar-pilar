import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { WhatsAppSend } from '@/types';

interface SendInput {
  recipientPhone: string;
  body: string;
  recipientName?: string;
  prospectId?: string;
  templateId?: string;
}

interface WhatsAppState {
  sends: WhatsAppSend[];
  loadingSends: boolean;
  prospectSends: Record<string, WhatsAppSend[]>;
  sending: boolean;
  error: string | null;

  sendWhatsApp: (input: SendInput) => Promise<boolean>;
  fetchAllSends: () => Promise<void>;
  fetchProspectSends: (prospectId: string) => Promise<void>;
}

export const useWhatsAppStore = create<WhatsAppState>((set) => ({
  sends: [],
  loadingSends: false,
  prospectSends: {},
  sending: false,
  error: null,

  sendWhatsApp: async (input) => {
    set({ sending: true, error: null });
    try {
      const response = await supabase.functions.invoke('send-whatsapp', {
        body: input,
      });
      if (response.error) {
        set({ error: response.error.message ?? 'Error al enviar', sending: false });
        return false;
      }
      if (response.data?.error) {
        set({ error: response.data.error, sending: false });
        return false;
      }
      set({ sending: false });
      return true;
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Error desconocido', sending: false });
      return false;
    }
  },

  fetchAllSends: async () => {
    set({ loadingSends: true });
    const { data } = await supabase
      .from('whatsapp_sends')
      .select('*')
      .order('created_at', { ascending: false });
    set({ sends: (data ?? []) as WhatsAppSend[], loadingSends: false });
  },

  fetchProspectSends: async (prospectId) => {
    const { data, error } = await supabase
      .from('whatsapp_sends')
      .select('*')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false });
    if (error) return;
    set((s) => ({
      prospectSends: { ...s.prospectSends, [prospectId]: (data ?? []) as WhatsAppSend[] },
    }));
  },
}));
