import { create } from 'zustand';

import { supabase } from '../lib/supabase';
import type { Interaction, InteractionWithClient } from '../types';

interface InteractionsState {
  interactions: InteractionWithClient[];
  loading: boolean;
  error: string | null;

  fetchInteractions: (filters?: {
    campaignId?: string;
    clientId?: string;
    assignmentId?: string;
  }) => Promise<void>;
  fetchMyInteractions: () => Promise<void>;
  createInteraction: (
    data: Omit<Interaction, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<Interaction | null>;
  updateInteraction: (
    id: string,
    data: Partial<Omit<Interaction, 'id' | 'created_at' | 'updated_at'>>
  ) => Promise<void>;
}

export const useInteractionsStore = create<InteractionsState>()((set) => ({
  interactions: [],
  loading: false,
  error: null,

  fetchInteractions: async (filters) => {
    set({ loading: true, error: null });

    let query = supabase
      .from('interactions')
      .select('*, client:clients(*), campaign:campaigns(*)')
      .order('created_at', { ascending: false });

    if (filters?.campaignId)
      query = query.eq('campaign_id', filters.campaignId);
    if (filters?.clientId) query = query.eq('client_id', filters.clientId);
    if (filters?.assignmentId)
      query = query.eq('assignment_id', filters.assignmentId);

    const { data, error } = await query;

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    set({
      interactions: (data as InteractionWithClient[]) ?? [],
      loading: false,
    });
  },

  fetchMyInteractions: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('interactions')
      .select('*, client:clients(*), campaign:campaigns(*)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    set({
      interactions: (data as InteractionWithClient[]) ?? [],
      loading: false,
    });
  },

  createInteraction: async (input) => {
    set({ error: null });

    const { data, error } = await supabase
      .from('interactions')
      .insert(input)
      .select()
      .single();

    if (error) {
      set({ error: error.message });
      return null;
    }

    const interaction = data as Interaction;

    // Refetch with joins for the list
    const { data: full } = await supabase
      .from('interactions')
      .select('*, client:clients(*), campaign:campaigns(*)')
      .eq('id', interaction.id)
      .single();

    if (full) {
      set((state) => ({
        interactions: [full as InteractionWithClient, ...state.interactions],
      }));
    }

    // Auto-update assignment status to in_progress
    if (input.assignment_id) {
      await supabase
        .from('client_assignments')
        .update({ status: 'in_progress' })
        .eq('id', input.assignment_id)
        .eq('status', 'pending');
    }

    return interaction;
  },

  updateInteraction: async (id, data) => {
    set({ error: null });

    const { data: updated, error } = await supabase
      .from('interactions')
      .update(data)
      .eq('id', id)
      .select('*, client:clients(*), campaign:campaigns(*)')
      .single();

    if (error) {
      set({ error: error.message });
      return;
    }

    set((state) => ({
      interactions: state.interactions.map((i) =>
        i.id === id ? (updated as InteractionWithClient) : i
      ),
    }));
  },
}));
