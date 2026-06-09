import { create } from 'zustand';

import { supabase } from '../lib/supabase';
import type { Client } from '../types';

interface ClientsState {
  clients: Client[];
  loading: boolean;
  error: string | null;

  fetchClients: () => Promise<void>;
  createClient: (data: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'owner_user_id' | 'company_id'>) => Promise<Client | null>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
}

export const useClientsStore = create<ClientsState>()((set) => ({
  clients: [],
  loading: false,
  error: null,

  fetchClients: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    set({ clients: (data as Client[]) ?? [], loading: false });
  },

  createClient: async (input) => {
    set({ error: null });

    const { data, error } = await supabase
      .from('clients')
      .insert(input)
      .select()
      .single();

    if (error) {
      set({ error: error.message });
      return null;
    }

    const client = data as Client;
    set((state) => ({
      clients: [...state.clients, client].sort((a, b) => a.name.localeCompare(b.name)),
    }));
    return client;
  },

  updateClient: async (id, data) => {
    set({ error: null });

    const { data: updated, error } = await supabase
      .from('clients')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      set({ error: error.message });
      return;
    }

    set((state) => ({
      clients: state.clients.map((c) => (c.id === id ? (updated as Client) : c)),
    }));
  },
}));
