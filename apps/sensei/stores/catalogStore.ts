/**
 * stores/catalogStore.ts — Generic store factory for configurable catalogs
 * (company-scoped lookup tables with: id, company_id, name, active).
 *
 * Used for payment_methods and financiers. company_id is filled by the table's
 * DEFAULT public.my_company_id(), so inserts only send { name }.
 */

import { create } from 'zustand';

import { supabase } from '../lib/supabase';

export interface CatalogItem {
  id: string;
  company_id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface CatalogState {
  items: CatalogItem[];
  loading: boolean;
  error: string | null;

  fetchItems: () => Promise<void>;
  createItem: (name: string) => Promise<CatalogItem | null>;
  toggleActive: (id: string, active: boolean) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export function createCatalogStore(table: string) {
  return create<CatalogState>()((set) => ({
    items: [],
    loading: false,
    error: null,

    fetchItems: async () => {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        set({ error: error.message, loading: false });
        return;
      }

      set({ items: (data as CatalogItem[]) ?? [], loading: false });
    },

    createItem: async (name: string) => {
      set({ error: null });

      const { data, error } = await supabase
        .from(table)
        .insert({ name })
        .select()
        .single();

      if (error) {
        set({ error: error.message });
        return null;
      }

      const item = data as CatalogItem;
      set((state) => ({
        items: [...state.items, item].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }));
      return item;
    },

    toggleActive: async (id: string, active: boolean) => {
      set({ error: null });

      const { error } = await supabase
        .from(table)
        .update({ active })
        .eq('id', id);

      if (error) {
        set({ error: error.message });
        return;
      }

      set((state) => ({
        items: state.items.map((i) => (i.id === id ? { ...i, active } : i)),
      }));
    },

    deleteItem: async (id: string) => {
      set({ error: null });

      const { error } = await supabase.from(table).delete().eq('id', id);

      if (error) {
        set({ error: error.message });
        return;
      }

      set((state) => ({
        items: state.items.filter((i) => i.id !== id),
      }));
    },
  }));
}
