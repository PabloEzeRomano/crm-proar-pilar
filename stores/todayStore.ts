import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import dayjs from '../lib/dayjs'
import { VisitWithClient } from '../types'

export type TodaySpan = 'today' | 'week' | 'month'

interface TodayState {
  visits: VisitWithClient[]
  span: TodaySpan
  loading: boolean
  error: string | null
  lastFetched: string | null
  isStale: boolean
  fetchTodayVisits: (span?: TodaySpan) => Promise<void>
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

      fetchTodayVisits: async (span: TodaySpan = get().span) => {
        set({ loading: true, error: null, span })

        const now = dayjs()
        const start = now.startOf(span === 'today' ? 'day' : span === 'week' ? 'week' : 'month').toISOString()
        const end = now.endOf(span === 'today' ? 'day' : span === 'week' ? 'week' : 'month').toISOString()

        const { data, error } = await supabase
          .from('visits')
          .select('*, client:clients(*)')
          .gte('scheduled_at', start)
          .lte('scheduled_at', end)
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
        span: state.span,
        lastFetched: state.lastFetched,
      }),
    }
  )
)
