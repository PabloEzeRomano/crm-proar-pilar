import { create } from 'zustand';

import { supabase } from '../lib/supabase';
import type { RejectionReason } from '../types';

interface RejectionReasonsState {
  reasons: RejectionReason[];
  loading: boolean;
  error: string | null;

  fetchReasons: () => Promise<void>;
  createReason: (value: string) => Promise<RejectionReason | null>;
  toggleActive: (id: string, active: boolean) => Promise<void>;
  deleteReason: (id: string) => Promise<void>;
}

export const useRejectionReasonsStore = create<RejectionReasonsState>()(
  (set) => ({
    reasons: [],
    loading: false,
    error: null,

    fetchReasons: async () => {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from('rejection_reasons')
        .select('*')
        .order('value', { ascending: true });

      if (error) {
        set({ error: error.message, loading: false });
        return;
      }

      set({ reasons: (data as RejectionReason[]) ?? [], loading: false });
    },

    createReason: async (value: string) => {
      set({ error: null });

      const { data, error } = await supabase
        .from('rejection_reasons')
        .insert({ value })
        .select()
        .single();

      if (error) {
        set({ error: error.message });
        return null;
      }

      const reason = data as RejectionReason;
      set((state) => ({
        reasons: [...state.reasons, reason].sort((a, b) =>
          a.value.localeCompare(b.value)
        ),
      }));
      return reason;
    },

    toggleActive: async (id: string, active: boolean) => {
      set({ error: null });

      const { error } = await supabase
        .from('rejection_reasons')
        .update({ active })
        .eq('id', id);

      if (error) {
        set({ error: error.message });
        return;
      }

      set((state) => ({
        reasons: state.reasons.map((r) => (r.id === id ? { ...r, active } : r)),
      }));
    },

    deleteReason: async (id: string) => {
      set({ error: null });

      const { error } = await supabase
        .from('rejection_reasons')
        .delete()
        .eq('id', id);

      if (error) {
        set({ error: error.message });
        return;
      }

      set((state) => ({
        reasons: state.reasons.filter((r) => r.id !== id),
      }));
    },
  })
);
