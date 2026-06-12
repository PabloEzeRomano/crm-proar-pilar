import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import dayjs from '../lib/dayjs';
import { VisitWithClient } from '../types';

export type TodaySpan = 'today' | 'week' | 'month';

interface TodayState {
  visits: VisitWithClient[];
  span: TodaySpan;
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
  isStale: boolean;
  fetchTodayVisits: (span?: TodaySpan, showAll?: boolean) => Promise<void>;
}

export const useTodayStore = create<TodayState>()(
  persist(
    (set, get) => ({
      visits: [],
      span: 'today',
      loading: false,
      error: null,
      lastFetched: null,
      isStale: false,
      fetchTodayVisits: async (
        span: TodaySpan = get().span,
        showAll?: boolean
      ) => {
        set({ loading: true, error: null, span });

        const now = dayjs();
        const start = now
          .startOf(
            span === 'today' ? 'day' : span === 'week' ? 'week' : 'month'
          )
          .toISOString();
        const end = now
          .endOf(span === 'today' ? 'day' : span === 'week' ? 'week' : 'month')
          .toISOString();

        const { data, error } = await supabase
          .from('visits')
          .select('*, client:clients(*)')
          .gte('scheduled_at', start)
          .lte('scheduled_at', end)
          .order('scheduled_at', { ascending: true });

        if (error) {
          const { lastFetched } = get();
          const cacheIsFromToday = lastFetched
            ? dayjs(lastFetched).isSame(dayjs(), 'day')
            : false;
          set({
            loading: false,
            error: error.message,
            isStale: cacheIsFromToday,
          });
          return;
        }

        let visits = (data as unknown as VisitWithClient[]) ?? [];

        // If admin view, fetch owner profiles for all visits
        if (showAll && visits.length > 0) {
          const ownerIds = Array.from(
            new Set(visits.map((v) => v.owner_user_id))
          );
          if (ownerIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name, email_config')
              .in('id', ownerIds);

            if (profiles) {
              const profileMap = Object.fromEntries(
                profiles.map((p) => [p.id, p])
              );
              visits = visits.map((v) => ({
                ...v,
                owner: profileMap[v.owner_user_id],
              }));
            }
          }
        }

        // Sort: non-completed first (by scheduled_at asc), completed last
        visits.sort((a, b) => {
          const aCompleted = a.status === 'completed' || a.status === 'canceled';
          const bCompleted = b.status === 'completed' || b.status === 'canceled';
          if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
          return dayjs(a.scheduled_at).diff(dayjs(b.scheduled_at));
        });

        set({
          visits,
          loading: false,
          error: null,
          isStale: false,
          lastFetched: dayjs().toISOString(),
        });
      },
    }),
    {
      name: 'today-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        visits: state.visits,
        span: state.span,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
