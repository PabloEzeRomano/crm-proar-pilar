import { useMemo } from 'react'
import { useClientsStore } from '../stores/clientsStore'
import { Client } from '../types'
import { CreateClientInput, UpdateClientInput } from '../validators/client'

export function useClients(searchQuery?: string, rubroFilter?: string, localidadFilter?: string) {
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
          (client.industry?.toLowerCase().includes(query) ?? false),
      )
    }

    if (rubroFilter) {
      result = result.filter((c) => c.industry === rubroFilter)
    }

    if (localidadFilter) {
      result = result.filter((c) => c.city === localidadFilter)
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
