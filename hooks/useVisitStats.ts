/**
 * useVisitStats — EP-018
 *
 * Computes visit statistics from the loaded visits in visitsStore.
 * - 18.1: This week / month count and completion rate
 * - 18.2: Top clients by visit frequency
 */

import { useMemo } from 'react'
import dayjs from '../lib/dayjs'
import { useVisitsStore } from '../stores/visitsStore'

export interface PeriodStats {
  total: number
  completed: number
  pending: number
  completionRate: number // 0–100
}

export interface TopClient {
  clientId: string
  clientName: string
  visitCount: number
}

export interface VisitStats {
  week: PeriodStats
  month: PeriodStats
  topClients: TopClient[]
}

export function useVisitStats(): VisitStats {
  const visits = useVisitsStore((s) => s.visits)

  return useMemo(() => {
    const now = dayjs()

    // Helpers
    const rate = (total: number, completed: number): number =>
      total > 0 ? Math.round((completed / total) * 100) : 0

    const periodStats = (isSamePeriod: (d: dayjs.Dayjs) => boolean): PeriodStats => {
      const periodVisits = visits.filter(
        (v) => isSamePeriod(dayjs(v.scheduled_at)) && v.status !== 'canceled',
      )
      const completed = periodVisits.filter((v) => v.status === 'completed').length
      const pending = periodVisits.filter((v) => v.status === 'pending').length
      const total = periodVisits.length
      return { total, completed, pending, completionRate: rate(total, completed) }
    }

    // Top clients by visit count (all loaded visits, excluding canceled)
    const clientMap = new Map<string, { name: string; count: number }>()
    for (const v of visits) {
      if (v.status === 'canceled') continue
      const entry = clientMap.get(v.client_id)
      if (entry) {
        entry.count++
      } else {
        clientMap.set(v.client_id, { name: v.client?.name ?? 'Desconocido', count: 1 })
      }
    }
    const topClients: TopClient[] = Array.from(clientMap.entries())
      .map(([clientId, { name, count }]) => ({ clientId, clientName: name, visitCount: count }))
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 5)

    return {
      week: periodStats((d) => d.isSame(now, 'week')),
      month: periodStats((d) => d.isSame(now, 'month')),
      topClients,
    }
  }, [visits])
}
