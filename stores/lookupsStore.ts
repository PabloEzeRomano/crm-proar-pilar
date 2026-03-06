/**
 * stores/lookupsStore.ts — Shared lookup values (Rubro, Localidad)
 *
 * Fetched once on app boot, cached in AsyncStorage.
 * No owner_user_id — these lists are global/shared across all users.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

interface LookupsState {
  rubros: string[]
  localidades: string[]
  loading: boolean
  fetchLookups: () => Promise<void>
}

export const useLookupsStore = create<LookupsState>()(
  persist(
    (set) => ({
      rubros: [],
      localidades: [],
      loading: false,

      fetchLookups: async () => {
        set({ loading: true })

        const { data, error } = await supabase
          .from('lookup_values')
          .select('type, value')
          .order('value')

        if (error || !data) {
          set({ loading: false })
          return
        }

        set({
          rubros: data
            .filter((d) => d.type === 'rubro')
            .map((d) => d.value as string),
          localidades: data
            .filter((d) => d.type === 'localidad')
            .map((d) => d.value as string),
          loading: false,
        })
      },
    }),
    {
      name: 'lookups-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        rubros: state.rubros,
        localidades: state.localidades,
      }),
    },
  ),
)
