import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Prospect, ProspectInteraction, ProspectStage } from '@/types';
import type {
  CreateProspectInput,
  UpdateProspectInput,
  CreateInteractionInput,
} from '@/validators/prospect';

interface ProspectsState {
  prospects: Prospect[];
  interactions: Record<string, ProspectInteraction[]>; // keyed by prospect_id
  loading: boolean;
  error: string | null;

  fetchProspects: () => Promise<void>;
  fetchInteractions: (prospectId: string) => Promise<void>;
  createProspect: (data: CreateProspectInput) => Promise<Prospect | null>;
  updateProspect: (id: string, data: UpdateProspectInput) => Promise<void>;
  moveProspect: (id: string, stage: ProspectStage) => Promise<void>;
  deleteProspect: (id: string) => Promise<void>;
  addInteraction: (data: CreateInteractionInput) => Promise<ProspectInteraction | null>;
}

export const useProspectsStore = create<ProspectsState>((set, get) => ({
  prospects: [],
  interactions: {},
  loading: false,
  error: null,

  fetchProspects: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      set({ error: error.message, loading: false });
      return;
    }
    set({ prospects: data ?? [], loading: false });
  },

  fetchInteractions: async (prospectId: string) => {
    const { data, error } = await supabase
      .from('prospect_interactions')
      .select('*')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false });
    if (error) return;
    set((s) => ({
      interactions: { ...s.interactions, [prospectId]: data ?? [] },
    }));
  },

  createProspect: async (input: CreateProspectInput) => {
    const userId = useAuthStore.getState().session?.user?.id;
    const profile = useAuthStore.getState().profile;
    if (!userId || !profile?.company_id) return null;

    const { data, error } = await supabase
      .from('prospects')
      .insert({
        ...input,
        owner_user_id: userId,
        company_id: profile.company_id,
      })
      .select()
      .single();

    if (error || !data) return null;
    set((s) => ({ prospects: [data, ...s.prospects] }));
    return data;
  },

  updateProspect: async (id: string, input: UpdateProspectInput) => {
    const { data, error } = await supabase
      .from('prospects')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) return;
    set((s) => ({
      prospects: s.prospects.map((p) => (p.id === id ? data : p)),
    }));
  },

  moveProspect: async (id: string, stage: ProspectStage) => {
    await get().updateProspect(id, { stage });
  },

  deleteProspect: async (id: string) => {
    const { error } = await supabase.from('prospects').delete().eq('id', id);
    if (error) return;
    set((s) => ({
      prospects: s.prospects.filter((p) => p.id !== id),
    }));
  },

  addInteraction: async (input: CreateInteractionInput) => {
    const userId = useAuthStore.getState().session?.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from('prospect_interactions')
      .insert({ ...input, user_id: userId })
      .select()
      .single();

    if (error || !data) return null;
    set((s) => ({
      interactions: {
        ...s.interactions,
        [input.prospect_id]: [data, ...(s.interactions[input.prospect_id] ?? [])],
      },
    }));
    return data;
  },
}));
