import { useMemo } from 'react';
import { useTodayStore } from '../stores/todayStore';
import { VisitWithClient } from '../types';
import dayjs from '../lib/dayjs';

export function useToday(showAll?: boolean) {
  const visits = useTodayStore((s) => s.visits);
  const span = useTodayStore((s) => s.span);
  const loading = useTodayStore((s) => s.loading);
  const error = useTodayStore((s) => s.error);
  const isStale = useTodayStore((s) => s.isStale);
  const lastFetched = useTodayStore((s) => s.lastFetched);
  const fetchTodayVisitsRaw = useTodayStore((s) => s.fetchTodayVisits);

  // Next pending visit not yet completed (first by scheduled_at ASC)
  const nextVisit = useMemo<VisitWithClient | null>(() => {
    const pending = visits.filter((v) => v.status === 'pending');
    if (pending.length === 0) return null;
    return pending[0];
  }, [visits]);

  // Is the next visit overdue? (scheduled_at is in the past but still pending)
  const isNextOverdue = useMemo<boolean>(() => {
    if (!nextVisit) return false;
    return dayjs(nextVisit.scheduled_at).isBefore(dayjs());
  }, [nextVisit]);

  // Minutes until next visit (negative = overdue)
  const minutesUntilNext = useMemo<number | null>(() => {
    if (!nextVisit) return null;
    return dayjs(nextVisit.scheduled_at).diff(dayjs(), 'minute');
  }, [nextVisit]);

  return {
    visits,
    span,
    nextVisit,
    isNextOverdue,
    minutesUntilNext,
    loading,
    error,
    isStale,
    lastFetched,
    fetchTodayVisits: (span?: 'today' | 'week' | 'month') =>
      fetchTodayVisitsRaw(span, showAll),
  };
}
