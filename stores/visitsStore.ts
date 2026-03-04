import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { Visit, VisitWithClient, VisitStatus } from '../types'
import { CreateVisitInput, UpdateVisitInput } from '../validators/visit'

interface VisitsState {
  visits: VisitWithClient[]
  loading: boolean
  error: string | null
  fetchVisits: () => Promise<void>
  createVisit: (data: CreateVisitInput) => Promise<Visit | null>
  updateVisit: (id: string, data: UpdateVisitInput) => Promise<void>
  updateStatus: (id: string, status: VisitStatus) => Promise<void>
  deleteVisit: (id: string) => Promise<void>
}

export const useVisitsStore = create<VisitsState>()((set) => ({
  visits: [],
  loading: false,
  error: null,

  fetchVisits: async () => {
    set({ loading: true, error: null })

    const { data, error } = await supabase
      .from('visits')
      .select('*, client:clients(*)')
      .order('scheduled_at', { ascending: false })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    set({ visits: (data as VisitWithClient[]) ?? [], loading: false })
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
      .insert({ ...data, owner_user_id: user.id, status: 'pending' })
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

    const { error } = await supabase
      .from('visits')
      .delete()
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return
    }

    set((state) => ({
      visits: state.visits.filter((v) => v.id !== id),
    }))
  },
}))
