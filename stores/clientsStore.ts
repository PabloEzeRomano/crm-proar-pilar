import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import { Client } from '../types'
import { CreateClientInput, UpdateClientInput } from '../validators/client'

interface ClientsState {
  clients: Client[]
  loading: boolean
  error: string | null
  fetchClients: () => Promise<void>
  fetchClient: (id: string) => Promise<Client | null>
  createClient: (data: CreateClientInput) => Promise<Client | null>
  updateClient: (id: string, data: UpdateClientInput) => Promise<void>
  deleteClient: (id: string) => Promise<void>
  deleteAllUserClients: () => Promise<void>
}

function normalizeClientInput(data: CreateClientInput) {
  return {
    ...data,
    industry: data.industry || null,
    address: data.address || null,
    city: data.city || null,
    contacts: data.contacts ?? [],
    notes: data.notes || null,
  }
}

export const useClientsStore = create<ClientsState>()(
  persist(
    (set) => ({
  clients: [],
  loading: false,
  error: null,

  fetchClients: async () => {
    set({ loading: true, error: null })

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    set({ clients: (data as Client[]) ?? [], loading: false })
  },

  fetchClient: async (id: string) => {
    set({ error: null })

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    const client = (data as Client) ?? null
    if (client) {
      set((state) => {
        const existing = state.clients.find((c) => c.id === id)
        return {
          clients: existing
            ? state.clients.map((c) => (c.id === id ? client : c))
            : [...state.clients, client],
        }
      })
    }
    return client
  },

  createClient: async (data: CreateClientInput) => {
    set({ error: null })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      set({ error: 'Usuario no autenticado' })
      return null
    }

    const normalized = normalizeClientInput(data)

    const { data: created, error } = await supabase
      .from('clients')
      .insert({ ...normalized, owner_user_id: user.id })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    const newClient = created as Client

    set((state) => ({ clients: [...state.clients, newClient] }))

    return newClient
  },

  updateClient: async (id: string, data: UpdateClientInput) => {
    set({ error: null })

    const normalized = normalizeClientInput(data as CreateClientInput)

    const { data: updated, error } = await supabase
      .from('clients')
      .update(normalized)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return
    }

    const updatedClient = updated as Client

    set((state) => ({
      clients: state.clients.map((c) => (c.id === id ? updatedClient : c)),
    }))
  },

  deleteClient: async (id: string) => {
    set({ error: null })

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return
    }

    set((state) => ({
      clients: state.clients.filter((c) => c.id !== id),
    }))
  },

  deleteAllUserClients: async () => {
    set({ error: null })

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      set({ error: 'Usuario no autenticado' })
      return
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('owner_user_id', user.id)

    if (error) {
      set({ error: error.message })
      return
    }

    set({ clients: [] })
  },
    }),
    {
      name: 'clients-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ clients: state.clients }),
    }
  )
)
