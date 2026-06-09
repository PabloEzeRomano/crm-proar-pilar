import { create } from 'zustand';

import { supabase } from '../lib/supabase';
import type { Branch } from '../types';
import type { BranchInput } from '../validators/branch';

interface BranchesState {
  branches: Branch[];
  loading: boolean;
  error: string | null;

  fetchBranches: () => Promise<void>;
  createBranch: (data: BranchInput) => Promise<Branch | null>;
  updateBranch: (id: string, data: BranchInput) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
}

export const useBranchesStore = create<BranchesState>()((set) => ({
  branches: [],
  loading: false,
  error: null,

  fetchBranches: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    set({ branches: (data as Branch[]) ?? [], loading: false });
  },

  createBranch: async (input: BranchInput) => {
    set({ error: null });

    const { data, error } = await supabase
      .from('branches')
      .insert(input)
      .select()
      .single();

    if (error) {
      set({ error: error.message });
      return null;
    }

    const branch = data as Branch;
    set((state) => ({
      branches: [...state.branches, branch].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    }));
    return branch;
  },

  updateBranch: async (id: string, data: BranchInput) => {
    set({ error: null });

    const { data: updated, error } = await supabase
      .from('branches')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      set({ error: error.message });
      return;
    }

    set((state) => ({
      branches: state.branches
        .map((b) => (b.id === id ? (updated as Branch) : b))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  },

  deleteBranch: async (id: string) => {
    set({ error: null });

    const { error } = await supabase.from('branches').delete().eq('id', id);

    if (error) {
      set({ error: error.message });
      return;
    }

    set((state) => ({
      branches: state.branches.filter((b) => b.id !== id),
    }));
  },
}));
