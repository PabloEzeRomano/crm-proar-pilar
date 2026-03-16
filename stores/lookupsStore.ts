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
  error: string | null
  lastFetchedAt: number | null
  fetchLookups: () => Promise<void>
  refetchIfStale: (staleAfterMs?: number) => Promise<void>
}

export const useLookupsStore = create<LookupsState>()(
  persist(
    (set) => ({
      rubros: [],
      localidades: [],
      loading: false,
      error: null,
      lastFetchedAt: null,

      fetchLookups: async () => {
        set({ loading: true, error: null })

        const { data, error } = await supabase
          .from('lookup_values')
          .select('type, value')
          .order('value')

        if (error || !data) {
          set({ loading: false, error: error?.message || 'Error loading lookups' })
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
          error: null,
          lastFetchedAt: Date.now(),
        })

      refetchIfStale: async (staleAfterMs = 5 * 60 * 1000) => {
        // 5 minutes default
        const { lastFetchedAt } = get()
        if (!lastFetchedAt || Date.now() - lastFetchedAt > staleAfterMs) {
          await get().fetchLookups()
        }
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
