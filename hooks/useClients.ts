import { useMemo } from 'react'
import { useClientsStore } from '../stores/clientsStore'
import { Client } from '../types'
import { CreateClientInput, UpdateClientInput } from '../validators/client'

export function useClients(searchQuery?: string, rubroFilter?: string[], localidadFilter?: string[]) {
  const clients = useClientsStore((state) => state.clients)
  const loading = useClientsStore((state) => state.loading)
  const error = useClientsStore((state) => state.error)
  const fetchClients = useClientsStore((state) => state.fetchClients)
  const createClient = useClientsStore((state) => state.createClient)
  const updateClient = useClientsStore((state) => state.updateClient)
  const deleteClient = useClientsStore((state) => state.deleteClient)

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

    return result
  }, [clients, searchQuery, rubroFilter, localidadFilter])

  return {
    clients: filteredClients,
    loading,
    error,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
  }
}
