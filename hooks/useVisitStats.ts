/**
 * useVisitStats — EP-018
 *
 * Computes visit statistics from the loaded visits in visitsStore.
 * - 18.1: This week / month count and completion rate
 * - 18.2: Top clients by visit frequency
 *
 * EP-039: Accepts optional filters (completedOnly, dateFrom, dateTo).
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

export interface VisitStatsFilters {
  completedOnly?: boolean
  dateFrom?: Date | null
  dateTo?: Date | null
}

export function useVisitStats(filters?: VisitStatsFilters): VisitStats {
  const visits = useVisitsStore((s) => s.visits)
  const completedOnly = filters?.completedOnly ?? false
  const dateFrom = filters?.dateFrom ?? null
  const dateTo = filters?.dateTo ?? null

  return useMemo(() => {
    const now = dayjs()

    // Apply global filters first
    let baseVisits = visits.filter((v) => {
      if (v.status === 'canceled') return false
      if (completedOnly && v.status !== 'completed') return false
      const scheduled = dayjs(v.scheduled_at)
      if (dateFrom && scheduled.isBefore(dayjs(dateFrom).startOf('day'))) return false
      if (dateTo && scheduled.isAfter(dayjs(dateTo).endOf('day'))) return false
      return true
    })

    // Helpers
    const rate = (total: number, completed: number): number =>
      total > 0 ? Math.round((completed / total) * 100) : 0

    const periodStats = (isSamePeriod: (d: dayjs.Dayjs) => boolean): PeriodStats => {
      const periodVisits = baseVisits.filter((v) => isSamePeriod(dayjs(v.scheduled_at)))
      const completed = periodVisits.filter((v) => v.status === 'completed').length
      const pending = periodVisits.filter((v) => v.status === 'pending').length
      const total = periodVisits.length
      return { total, completed, pending, completionRate: rate(total, completed) }
    }

    // Top clients by visit count
    const clientMap = new Map<string, { name: string; count: number }>()
    for (const v of baseVisits) {
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

    // When date range filter is active, week/month cards show filtered totals
    // (period filter still applies so only visits within the range AND the period are counted)
    return {
      week: periodStats((d) => d.isSame(now, 'week')),
      month: periodStats((d) => d.isSame(now, 'month')),
      topClients,
    }
  }, [visits, completedOnly, dateFrom, dateTo]) // eslint-disable-line react-hooks/exhaustive-deps
}
