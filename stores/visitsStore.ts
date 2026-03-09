import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import { Visit, VisitWithClient, VisitStatus } from '../types'
import { CreateVisitInput, UpdateVisitInput } from '../validators/visit'

const PAGE_SIZE = 100

interface VisitsState {
  visits: VisitWithClient[]
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  error: string | null
  fetchVisits: () => Promise<void>
  fetchMoreVisits: () => Promise<void>
  fetchVisit: (id: string) => Promise<void>
  fetchVisitsByClient: (clientId: string) => Promise<void>
  createVisit: (data: CreateVisitInput) => Promise<Visit | null>
  updateVisit: (id: string, data: UpdateVisitInput) => Promise<void>
  updateStatus: (id: string, status: VisitStatus) => Promise<void>
  deleteVisit: (id: string) => Promise<void>
}

export const useVisitsStore = create<VisitsState>()(
  persist(
    (set, get) => ({
      visits: [],
      hasMore: true,
      loading: false,
      loadingMore: false,
      error: null,

      fetchVisits: async () => {
        set({ loading: true, error: null })

        const { data, error } = await supabase
          .from('visits')
          .select('*, client:clients(*)')
          .order('scheduled_at', { ascending: false })
          .limit(PAGE_SIZE)

        if (error) {
          set({ error: error.message, loading: false })
          return
        }

        const rows = (data as VisitWithClient[]) ?? []
        set({ visits: rows, hasMore: rows.length === PAGE_SIZE, loading: false })
      },

      fetchMoreVisits: async () => {
        const { visits, hasMore, loadingMore, loading } = get()
        if (!hasMore || loadingMore || loading) return

        const oldest = visits[visits.length - 1]
        if (!oldest) return

        set({ loadingMore: true })

        const { data, error } = await supabase
          .from('visits')
          .select('*, client:clients(*)')
          .order('scheduled_at', { ascending: false })
          .lt('scheduled_at', oldest.scheduled_at)
          .limit(PAGE_SIZE)

        if (error) {
          set({ error: error.message, loadingMore: false })
          return
        }

        const rows = (data as VisitWithClient[]) ?? []
        set((state) => ({
          visits: [...state.visits, ...rows],
          hasMore: rows.length === PAGE_SIZE,
          loadingMore: false,
        }))
      },

      fetchVisitsByClient: async (clientId: string) => {
        const { data, error } = await supabase
          .from('visits')
          .select('*, client:clients(*)')
          .eq('client_id', clientId)
          .order('scheduled_at', { ascending: false })

        if (error || !data) return

        const incoming = data as VisitWithClient[]
        set((state) => {
          // Merge: replace any existing visits for this client, keep the rest
          const others = state.visits.filter((v) => v.client_id !== clientId)
          return { visits: [...others, ...incoming] }
        })
      },

      fetchVisit: async (id: string) => {
        const { data, error } = await supabase
          .from('visits')
          .select('*, client:clients(*)')
          .eq('id', id)
          .single()

        if (error || !data) return

        const visit = data as VisitWithClient
        set((state) => {
          const exists = state.visits.some((v) => v.id === id)
          return {
            visits: exists
              ? state.visits.map((v) => (v.id === id ? visit : v))
              : [visit, ...state.visits],
          }
        })
      },

      createVisit: async (data: CreateVisitInput) => {
        set({ error: null })

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          set({ error: 'Usuario no autenticado' })
          return null
        }

        const { data: created, error } = await supabase
          .from('visits')
          .insert({ ...data, owner_user_id: user.id, status: data.status ?? 'pending' })
          .select('*, client:clients(*)')
          .single()

        if (error) {
          set({ error: error.message })
          return null
        }

        const newVisit = created as VisitWithClient
        set((state) => ({ visits: [newVisit, ...state.visits] }))
        return newVisit
      },

      updateVisit: async (id: string, data: UpdateVisitInput) => {
        set({ error: null })

        const { data: updated, error } = await supabase
          .from('visits')
          .update(data)
          .eq('id', id)
          .select('*, client:clients(*)')
          .single()

        if (error) {
          set({ error: error.message })
          return
        }

        const updatedVisit = updated as VisitWithClient
        set((state) => ({
          visits: state.visits.map((v) => (v.id === id ? updatedVisit : v)),
        }))
      },

      updateStatus: async (id: string, status: VisitStatus) => {
        set({ error: null })

        const { data: updated, error } = await supabase
          .from('visits')
          .update({ status })
          .eq('id', id)
          .select('*, client:clients(*)')
          .single()

        if (error) {
          set({ error: error.message })
          return
        }

        const updatedVisit = updated as VisitWithClient
        set((state) => ({
          visits: state.visits.map((v) => (v.id === id ? updatedVisit : v)),
        }))
      },

      deleteVisit: async (id: string) => {
        set({ error: null })

        const { error } = await supabase.from('visits').delete().eq('id', id)

        if (error) {
          set({ error: error.message })
          return
        }

        set((state) => ({
          visits: state.visits.filter((v) => v.id !== id),
        }))
      },
    }),
    {
      name: 'visits-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ visits: state.visits, hasMore: state.hasMore }),
    }
  )
)
