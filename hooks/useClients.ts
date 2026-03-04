import { useMemo } from 'react'
import { useClientsStore } from '../stores/clientsStore'
import { Client } from '../types'
import { CreateClientInput, UpdateClientInput } from '../validators/client'

export function useClients(searchQuery?: string) {
  const clients = useClientsStore((state) => state.clients)
  const loading = useClientsStore((state) => state.loading)
  const error = useClientsStore((state) => state.error)
  const fetchClients = useClientsStore((state) => state.fetchClients)
  const createClient = useClientsStore((state) => state.createClient)
  const updateClient = useClientsStore((state) => state.updateClient)
  const deleteClient = useClientsStore((state) => state.deleteClient)

  const filteredClients = useMemo<Client[]>(() => {
    const trimmed = searchQuery?.trim()
    if (!trimmed) return clients

    const query = trimmed.toLowerCase()

    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        (client.city?.toLowerCase().includes(query) ?? false) ||
        (client.industry?.toLowerCase().includes(query) ?? false),
    )
  }, [clients, searchQuery])

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
