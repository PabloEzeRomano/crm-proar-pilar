import { useMemo } from 'react'
import { VisitWithClient, VisitStatus } from '../types'
import { useVisitsStore } from '../stores/visitsStore'

export function useVisits(clientId?: string, statusFilter?: VisitStatus | 'all') {
  const visits = useVisitsStore((state) => state.visits)
  const loading = useVisitsStore((state) => state.loading)
  const error = useVisitsStore((state) => state.error)
  const fetchVisits = useVisitsStore((state) => state.fetchVisits)
  const createVisit = useVisitsStore((state) => state.createVisit)
  const updateVisit = useVisitsStore((state) => state.updateVisit)
  const updateStatus = useVisitsStore((state) => state.updateStatus)
  const deleteVisit = useVisitsStore((state) => state.deleteVisit)

  const filteredVisits = useMemo<VisitWithClient[]>(() => {
    let result = visits

    if (clientId) {
      result = result.filter((v) => v.client_id === clientId)
    }

    if (statusFilter && statusFilter !== 'all') {
      result = result.filter((v) => v.status === statusFilter)
    }

    return result
  }, [visits, clientId, statusFilter])

  return {
    visits: filteredVisits,
    loading,
    error,
    fetchVisits,
    createVisit,
    updateVisit,
    updateStatus,
    deleteVisit,
  }
}
