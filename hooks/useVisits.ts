import { useMemo } from 'react'
import { VisitWithClient, VisitStatus } from '../types'
import { useVisitsStore } from '../stores/visitsStore'
import dayjs from '../lib/dayjs'

export function useVisits(clientId?: string, statusFilter?: VisitStatus | 'all' | 'upcoming', showAll?: boolean) {
  const visits = useVisitsStore((state) => state.visits)
  const hasMore = useVisitsStore((state) => state.hasMore)
  const loading = useVisitsStore((state) => state.loading)
  const loadingMore = useVisitsStore((state) => state.loadingMore)
  const error = useVisitsStore((state) => state.error)
  const fetchVisits = useVisitsStore((state) => state.fetchVisits)
  const fetchMoreVisits = useVisitsStore((state) => state.fetchMoreVisits)
  const fetchVisitsByClient = useVisitsStore((state) => state.fetchVisitsByClient)
  const createVisit = useVisitsStore((state) => state.createVisit)
  const updateVisit = useVisitsStore((state) => state.updateVisit)
  const updateStatus = useVisitsStore((state) => state.updateStatus)
  const deleteVisit = useVisitsStore((state) => state.deleteVisit)

  const filteredVisits = useMemo<VisitWithClient[]>(() => {
    let result = visits

    if (clientId) {
      result = result.filter((v) => v.client_id === clientId)
    }

    if (statusFilter === 'upcoming') {
      result = result.filter(
        (v) => v.status === 'pending' && dayjs(v.scheduled_at).isAfter(dayjs())
      )
    } else if (statusFilter && statusFilter !== 'all') {
      result = result.filter((v) => v.status === statusFilter)
    }

    return result
  }, [visits, clientId, statusFilter])

  return {
    visits: filteredVisits,
    hasMore,
    loading,
    loadingMore,
    error,
    fetchVisits: () => fetchVisits(showAll),
    fetchMoreVisits: () => fetchMoreVisits(showAll),
    fetchVisitsByClient,
    createVisit,
    updateVisit,
    updateStatus,
    deleteVisit,
  }
}
