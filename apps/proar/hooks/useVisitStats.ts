/**
 * useVisitStats — EP-018
 *
 * Computes visit statistics from the loaded visits in visitsStore.
 * - 18.1: This week / month count and completion rate
 * - 18.2: Top clients by visit frequency
 *
 * EP-039: Accepts optional filters (completedOnly, dateFrom, dateTo).
 */

import { useMemo } from 'react';
import dayjs from '../lib/dayjs';
import { useVisitsStore } from '../stores/visitsStore';
import type { VisitWithClient } from '../types';

export interface PeriodStats {
  total: number;
  totalAll: number; // unfiltered total (ignores completedOnly) — for reference context
  completed: number;
  pending: number;
  completionRate: number; // 0–100
}

export interface TopClient {
  clientId: string;
  clientName: string;
  visitCount: number;
}

export interface VisitStats {
  week: PeriodStats;
  month: PeriodStats;
  range: PeriodStats; // stats for the full selected date range
  hasDateFilter: boolean; // true when any date filter is active
  topClients: TopClient[];
}

export interface VisitStatsFilters {
  completedOnly?: boolean;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  /**
   * userId param controls which visits are used as source:
   *   undefined → own data only (uses visitsStore.visits — regular user, unchanged behavior)
   *   null      → all users (uses visitsStore.allVisits — admin aggregate view)
   *   string    → specific user (filters visitsStore.allVisits by owner_user_id)
   */
  userId?: string | null;
}

export function useVisitStats(filters?: VisitStatsFilters): VisitStats {
  const visits = useVisitsStore((s) => s.visits);
  const allVisits = useVisitsStore((s) => s.allVisits);
  const completedOnly = filters?.completedOnly ?? false;
  const dateFrom = filters?.dateFrom ?? null;
  const dateTo = filters?.dateTo ?? null;
  const userId = filters?.userId; // undefined | null | string

  return useMemo(() => {
    const now = dayjs();

    // Select source based on userId param
    let sourceVisits: VisitWithClient[];
    if (userId === undefined) {
      sourceVisits = visits;
    } else if (userId === null) {
      sourceVisits = allVisits;
    } else {
      sourceVisits = allVisits.filter((v) => v.owner_user_id === userId);
    }

    // Apply global filters first
    let baseVisits = sourceVisits.filter((v) => {
      if (v.status === 'canceled') return false;
      if (completedOnly && v.status !== 'completed') return false;
      const scheduled = dayjs(v.scheduled_at);
      if (dateFrom && scheduled.isBefore(dayjs(dateFrom).startOf('day')))
        return false;
      if (dateTo && scheduled.isAfter(dayjs(dateTo).endOf('day'))) return false;
      return true;
    });

    // Same as baseVisits but without the completedOnly filter — used to compute totalAll
    const allBaseVisits = sourceVisits.filter((v) => {
      if (v.status === 'canceled') return false;
      const scheduled = dayjs(v.scheduled_at);
      if (dateFrom && scheduled.isBefore(dayjs(dateFrom).startOf('day')))
        return false;
      if (dateTo && scheduled.isAfter(dayjs(dateTo).endOf('day'))) return false;
      return true;
    });

    // Helpers
    const rate = (total: number, completed: number): number =>
      total > 0 ? Math.round((completed / total) * 100) : 0;

    const periodStats = (
      isSamePeriod: (d: dayjs.Dayjs) => boolean
    ): PeriodStats => {
      const periodVisits = baseVisits.filter((v) =>
        isSamePeriod(dayjs(v.scheduled_at))
      );
      const allPeriodVisits = allBaseVisits.filter((v) =>
        isSamePeriod(dayjs(v.scheduled_at))
      );
      const completed = periodVisits.filter(
        (v) => v.status === 'completed'
      ).length;
      const pending = periodVisits.filter((v) => v.status === 'pending').length;
      const total = periodVisits.length;
      const totalAll = allPeriodVisits.length;
      return {
        total,
        totalAll,
        completed,
        pending,
        completionRate: rate(total, completed),
      };
    };

    const hasDateFilter = !!(dateFrom || dateTo);

    // Top clients by visit count
    const clientMap = new Map<string, { name: string; count: number }>();
    for (const v of baseVisits) {
      const entry = clientMap.get(v.client_id);
      if (entry) {
        entry.count++;
      } else {
        clientMap.set(v.client_id, {
          name: v.client?.name ?? 'Desconocido',
          count: 1,
        });
      }
    }
    const topClients: TopClient[] = Array.from(clientMap.entries())
      .map(([clientId, { name, count }]) => ({
        clientId,
        clientName: name,
        visitCount: count,
      }))
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 5);

    return {
      week: periodStats((d) => d.isSame(now, 'week')),
      month: periodStats((d) => d.isSame(now, 'month')),
      range: periodStats(() => true),
      hasDateFilter,
      topClients,
    };
  }, [visits, allVisits, completedOnly, dateFrom, dateTo, userId]);
}
