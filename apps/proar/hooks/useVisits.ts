import { useMemo } from 'react';
import { VisitWithClient, VisitStatus, VisitType } from '../types';
import { useVisitsStore } from '../stores/visitsStore';
import { useAuthStore } from '../stores/authStore';
import dayjs from '../lib/dayjs';

export function useVisits(
  clientId?: string,
  statusFilter?: VisitStatus | 'all' | 'upcoming',
  ownerFilter?: string[],
  typeFilter?: VisitType[]
) {
  const profile = useAuthStore((state) => state.profile);
  const isAdminOrRoot = profile?.role === 'admin' || profile?.role === 'root';

  const visits = useVisitsStore((state) => state.visits);
  const allVisits = useVisitsStore((state) => state.allVisits);
  const allVisitsLoading = useVisitsStore((state) => state.allVisitsLoading);
  const hasMore = useVisitsStore((state) => state.hasMore);
  const loading = useVisitsStore((state) => state.loading);
  const loadingMore = useVisitsStore((state) => state.loadingMore);
  const error = useVisitsStore((state) => state.error);
  const fetchVisitsAction = useVisitsStore((state) => state.fetchVisits);
  const fetchMoreVisits = useVisitsStore((state) => state.fetchMoreVisits);
  const fetchAllVisitsForAdmin = useVisitsStore(
    (state) => state.fetchAllVisitsForAdmin
  );
  const fetchVisitsByClient = useVisitsStore(
    (state) => state.fetchVisitsByClient
  );
  const createVisit = useVisitsStore((state) => state.createVisit);
  const updateVisit = useVisitsStore((state) => state.updateVisit);
  const updateStatus = useVisitsStore((state) => state.updateStatus);
  const deleteVisit = useVisitsStore((state) => state.deleteVisit);

  const sourceVisits = isAdminOrRoot ? allVisits : visits;

  const filteredVisits = useMemo<VisitWithClient[]>(() => {
    let result = sourceVisits;

    if (clientId) {
      result = result.filter((v) => v.client_id === clientId);
    }

    if (statusFilter === 'upcoming') {
      result = result.filter(
        (v) => v.status === 'pending' && dayjs(v.scheduled_at).isAfter(dayjs())
      );
    } else if (statusFilter && statusFilter !== 'all') {
      result = result.filter((v) => v.status === statusFilter);
    }

    if (ownerFilter && ownerFilter.length > 0) {
      result = result.filter((v) => ownerFilter.includes(v.owner_user_id));
    }

    if (typeFilter && typeFilter.length > 0) {
      result = result.filter((v) => typeFilter.includes(v.type));
    }

    return result;
  }, [sourceVisits, clientId, statusFilter, ownerFilter, typeFilter]);

  return {
    visits: filteredVisits,
    isAdminOrRoot,
    hasMore: isAdminOrRoot ? false : hasMore,
    loading: isAdminOrRoot ? allVisitsLoading : loading,
    loadingMore: isAdminOrRoot ? false : loadingMore,
    error,
    fetchVisits: () =>
      isAdminOrRoot ? fetchAllVisitsForAdmin() : fetchVisitsAction(),
    fetchMoreVisits: () => fetchMoreVisits(),
    fetchVisitsByClient,
    createVisit,
    updateVisit,
    updateStatus,
    deleteVisit,
  };
}
