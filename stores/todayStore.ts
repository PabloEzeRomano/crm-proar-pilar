import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import dayjs from '../lib/dayjs'
import { VisitWithClient } from '../types'

interface TodayState {
  visits: VisitWithClient[]
  loading: boolean
  error: string | null
  lastFetched: string | null
  isStale: boolean
  fetchTodayVisits: () => Promise<void>
}

export const useTodayStore = create<TodayState>()(
  persist(
    (set, get) => ({
      visits: [],
      loading: false,
      error: null,
      lastFetched: null,
      isStale: false,

      fetchTodayVisits: async () => {
        set({ loading: true, error: null })

        const todayStart = dayjs().startOf('day').toISOString()
        const todayEnd = dayjs().endOf('day').toISOString()

        const { data, error } = await supabase
          .from('visits')
          .select('*, client:clients(*)')
          .gte('scheduled_at', todayStart)
          .lte('scheduled_at', todayEnd)
          .order('scheduled_at', { ascending: true })

        if (error) {
          const { lastFetched } = get()
          const cacheIsFromToday = lastFetched
            ? dayjs(lastFetched).isSame(dayjs(), 'day')
            : false
          set({
            loading: false,
            error: error.message,
            isStale: cacheIsFromToday,
          })
          return
        }

        set({
          visits: (data as VisitWithClient[]) ?? [],
          loading: false,
          error: null,
          isStale: false,
          lastFetched: new Date().toISOString(),
        })
      },
    }),
    {
      name: 'today-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        visits: state.visits,
        lastFetched: state.lastFetched,
      }),
    }
  )
)
