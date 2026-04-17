import { useMemo } from 'react'
import dayjs from '../lib/dayjs'
import { useClientsStore } from '../stores/clientsStore'
import { useVisitsStore } from '../stores/visitsStore'
import { useAuthStore } from '../stores/authStore'
import { Client, VisitType } from '../types'
import { CreateClientInput, UpdateClientInput } from '../validators/client'

export type ClientSortOrder =
  | 'name-asc'
  | 'name-desc'
  | 'last-visited-recent'
  | 'last-visited-oldest'
  | 'stale-first'

export function useClients(
  searchQuery?: string,
  rubroFilter?: string[],
  localidadFilter?: string[],
  staleDays?: number | null,
  sortOrder?: ClientSortOrder,
  visitTypeFilter?: VisitType | null,
  ownerFilter?: string[],
) {
  const clients = useClientsStore((state) => state.clients)
  const loading = useClientsStore((state) => state.loading)
  const error = useClientsStore((state) => state.error)
  const fetchClientsAction = useClientsStore((state) => state.fetchClients)
  const fetchAllClientsForAdmin = useClientsStore((state) => state.fetchAllClientsForAdmin)
  const allClients = useClientsStore((state) => state.allClients)
  const allClientsLoading = useClientsStore((state) => state.allClientsLoading)
  const ownerProfiles = useClientsStore((state) => state.ownerProfiles)
  const createClient = useClientsStore((state) => state.createClient)
  const updateClient = useClientsStore((state) => state.updateClient)
  const deleteClient = useClientsStore((state) => state.deleteClient)
  const profile = useAuthStore((state) => state.profile)
  const allVisits = useVisitsStore((state) => state.visits)

  const isAdminMode = profile?.role === 'admin' || profile?.role === 'root'
  const baseClients = isAdminMode ? allClients : clients

  const filteredClients = useMemo<Client[]>(() => {
    let result = baseClients

    if (ownerFilter?.length) {
      result = result.filter((c) => ownerFilter.includes(c.owner_user_id))
    }

    const trimmed = searchQuery?.trim()
    if (trimmed) {
      const query = trimmed.toLowerCase()
      result = result.filter(
        (client) =>
          client.name.toLowerCase().includes(query) ||
          (client.city?.toLowerCase().includes(query) ?? false) ||
          (client.industry?.toLowerCase().includes(query) ?? false) ||
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

    if (visitTypeFilter) {
      const clientIdsWithType = new Set(
        allVisits
          .filter((v) => (v.type ?? 'visit') === visitTypeFilter)
          .map((v) => v.client_id),
      )
      result = result.filter((c) => clientIdsWithType.has(c.id))
    }

    const sorted = [...result]
    switch (sortOrder) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'))
        break
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name, 'es'))
        break
      case 'last-visited-recent':
        sorted.sort((a, b) => {
          const aTime = a.last_visited_at ? new Date(a.last_visited_at).getTime() : 0
          const bTime = b.last_visited_at ? new Date(b.last_visited_at).getTime() : 0
          return bTime - aTime
        })
        break
      case 'last-visited-oldest':
        sorted.sort((a, b) => {
          const aTime = a.last_visited_at ? new Date(a.last_visited_at).getTime() : 0
          const bTime = b.last_visited_at ? new Date(b.last_visited_at).getTime() : 0
          return aTime - bTime
        })
        break
      case 'stale-first':
        sorted.sort((a, b) => {
          const aDays = a.last_visited_at ? dayjs().diff(dayjs(a.last_visited_at), 'day') : Infinity
          const bDays = b.last_visited_at ? dayjs().diff(dayjs(b.last_visited_at), 'day') : Infinity
          return bDays - aDays
        })
        break
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'))
        break
    }

    return sorted
  }, [baseClients, ownerFilter, searchQuery, rubroFilter, localidadFilter, staleDays, sortOrder, visitTypeFilter, allVisits])

  return {
    clients: filteredClients,
    loading: isAdminMode ? allClientsLoading : loading,
    error,
    fetchClients: () => isAdminMode ? fetchAllClientsForAdmin() : fetchClientsAction(),
    createClient,
    updateClient,
    deleteClient,
    ownerProfiles,
    isAdminMode,
  }
}
