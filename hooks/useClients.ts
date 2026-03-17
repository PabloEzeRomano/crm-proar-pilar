import { useMemo, useState, useEffect } from 'react'
import dayjs from '../lib/dayjs'
import { supabase } from '../lib/supabase'
import { useClientsStore } from '../stores/clientsStore'
import { useAuthStore } from '../stores/authStore'
import { Client, Profile } from '../types'
import { CreateClientInput, UpdateClientInput } from '../validators/client'

export function useClients(
  searchQuery?: string,
  rubroFilter?: string[],
  localidadFilter?: string[],
  staleDays?: number | null,
) {
  const clients = useClientsStore((state) => state.clients)
  const loading = useClientsStore((state) => state.loading)
  const error = useClientsStore((state) => state.error)
  const fetchClients = useClientsStore((state) => state.fetchClients)
  const createClient = useClientsStore((state) => state.createClient)
  const updateClient = useClientsStore((state) => state.updateClient)
  const deleteClient = useClientsStore((state) => state.deleteClient)
  const profile = useAuthStore((state) => state.profile)

  // Owner profiles map for admin view
  const [ownerProfiles, setOwnerProfiles] = useState<Record<string, Profile | null>>({})

  // Fetch owner profiles when in admin mode
  useEffect(() => {
    if (profile?.role !== 'admin' || clients.length === 0) return

    const ownerIds = Array.from(new Set(clients.map((c) => c.owner_user_id)))
    if (ownerIds.length === 0) return

    const fetchOwnerProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ownerIds)

      if (!error && data) {
        const map = data.reduce(
          (acc, p) => {
            acc[p.id] = p
            return acc
          },
          {} as Record<string, Partial<Profile>>,
        )
        setOwnerProfiles(map as Record<string, Profile | null>)
      }
    }

    fetchOwnerProfiles()
  }, [profile?.role, clients])

  const filteredClients = useMemo<Client[]>(() => {
    let result = clients

    const trimmed = searchQuery?.trim()
    if (trimmed) {
      const query = trimmed.toLowerCase()
      result = result.filter(
        (client) =>
          client.name.toLowerCase().includes(query) ||
          (client.city?.toLowerCase().includes(query) ?? false) ||
          (client.industry?.toLowerCase().includes(query) ?? false) ||
          // Search in contact names and phone numbers
          (client.contacts?.some((c) =>
            (c.name?.toLowerCase().includes(query) ?? false) ||
            (c.phone?.toLowerCase().includes(query) ?? false) ||
            (c.email?.toLowerCase().includes(query) ?? false)
          ) ?? false),
      )
    }

    if (rubroFilter?.length) {
      result = result.filter((c) => c.industry && rubroFilter.includes(c.industry))
    }

    if (localidadFilter?.length) {
      result = result.filter((c) => c.city && localidadFilter.includes(c.city))
    }

    if (staleDays !== undefined && staleDays !== null) {
      result = result.filter(
        (c) =>
          c.last_visited_at === undefined ||
          c.last_visited_at === null ||
          dayjs().diff(dayjs(c.last_visited_at), 'day') >= staleDays,
      )
    }

    return result
  }, [clients, searchQuery, rubroFilter, localidadFilter, staleDays])

  return {
    clients: filteredClients,
    loading,
    error,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    ownerProfiles,
    isAdminMode: profile?.role === 'admin',
  }
}
