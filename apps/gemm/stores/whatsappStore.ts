import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { WhatsAppSend } from '@/types';

interface WhatsAppState {
  sends: WhatsAppSend[];
  loadingSends: boolean;
  prospectSends: Record<string, WhatsAppSend[]>;

  fetchAllSends: () => Promise<void>;
  fetchProspectSends: (prospectId: string) => Promise<void>;
}

export const useWhatsAppStore = create<WhatsAppState>((set) => ({
  sends: [],
  loadingSends: false,
  prospectSends: {},

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
