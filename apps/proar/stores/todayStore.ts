import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import dayjs from '../lib/dayjs';
import { VisitWithClient } from '../types';

// expo-location is only loaded on native platforms
// Use dynamic require with obfuscated string to avoid bundler static analysis
let Location: typeof import('expo-location') | null = null;
if (Platform.OS !== 'web') {
  try {
    // Build the module name dynamically to avoid Metro bundler resolution
    const mod = 'expo' + '-' + 'location';
    // eslint-disable-next-line global-require, import/no-dynamic-require
    Location = require(mod);
  } catch (e) {
    // Module not available
    Location = null;
  }
}

export type TodaySpan = 'today' | 'week' | 'month';

interface TodayState {
  visits: VisitWithClient[];
  span: TodaySpan;
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
  isStale: boolean;
  sortedByDistance: boolean;
  fetchTodayVisits: (span?: TodaySpan, showAll?: boolean) => Promise<void>;
  sortByDistance: () => Promise<void>;
  resetDistanceSort: () => void;
}

// Haversine distance calculation (returns km)
function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
      sortedByDistance: false,

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

        set({
          visits,
          loading: false,
          error: null,
          isStale: false,
          lastFetched: dayjs().toISOString(),
          sortedByDistance: false,
        });
      },

      sortByDistance: async () => {
        // sortByDistance is not available on web (expo-location requires native platform)
        if (Platform.OS === 'web' || !Location) {
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          // Alert will be handled by the component
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const { visits } = get();
        const sorted = [...visits].sort((a, b) => {
          const aHasCoords = a.client.latitude && a.client.longitude;
          const bHasCoords = b.client.latitude && b.client.longitude;

          if (!aHasCoords && !bHasCoords) return 0;
          if (!aHasCoords) return 1; // Clients without coords go to end
          if (!bHasCoords) return -1;

          const aDist = haversine(
            loc.coords.latitude,
            loc.coords.longitude,
            a.client.latitude as number,
            a.client.longitude as number
          );
          const bDist = haversine(
            loc.coords.latitude,
            loc.coords.longitude,
            b.client.latitude as number,
            b.client.longitude as number
          );
          return aDist - bDist;
        });

        set({ visits: sorted, sortedByDistance: true });
      },

      resetDistanceSort: () => {
        const { visits } = get();
        const sorted = [...visits].sort((a, b) =>
          dayjs(a.scheduled_at).diff(dayjs(b.scheduled_at))
        );
        set({ visits: sorted, sortedByDistance: false });
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
