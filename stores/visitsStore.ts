import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import dayjs from '../lib/dayjs'
import { supabase } from '../lib/supabase'
import { scheduleVisitReminder, cancelVisitReminder } from '../lib/notifications'
import { Visit, VisitWithClient, VisitStatus, VisitType } from '../types'
import { CreateVisitInput, UpdateVisitInput, updateStatusSchema } from '../validators/visit'

const PAGE_SIZE = 100
const GAP_KEY = 'visit-gap-minutes'
const DEFAULT_GAP = 60

interface VisitsState {
  visits: VisitWithClient[]
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  error: string | null
  deleting: boolean
  deleteError: string | null
  teamVisits: VisitWithClient[]
  teamLoading: boolean
  fetchVisits: () => Promise<void>
  fetchMoreVisits: () => Promise<void>
  fetchVisit: (id: string) => Promise<void>
  fetchVisitsByClient: (clientId: string) => Promise<void>
  fetchVisitsByOwner: (userId: string) => Promise<void>
  clearTeamVisits: () => void
  createVisit: (data: CreateVisitInput) => Promise<Visit | null>
  updateVisit: (id: string, data: UpdateVisitInput) => Promise<void>
  updateStatus: (id: string, status: VisitStatus) => Promise<void>
  deleteVisit: (id: string) => Promise<void>
  deleteAllUserVisits: () => Promise<void>
}

export const useVisitsStore = create<VisitsState>()(
  persist(
    (set, get) => ({
      visits: [],
      hasMore: true,
      loading: false,
      loadingMore: false,
      error: null,
      deleting: false,
      deleteError: null,
      teamVisits: [],
      teamLoading: false,

      fetchVisits: async () => {
        set({ loading: true, error: null })

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          set({ loading: false, error: 'Usuario no autenticado' })
          return
        }

        const { data, error } = await supabase
          .from('visits')
          .select('*, client:clients(*)')
          .eq('owner_user_id', user.id)
          .order('scheduled_at', { ascending: false })
          .limit(PAGE_SIZE)

        if (error) {
          set({ error: error.message, loading: false })
          return
        }

        const rows = (data as unknown as VisitWithClient[]) ?? []
        set({ visits: rows, hasMore: rows.length === PAGE_SIZE, loading: false })
      },

      fetchMoreVisits: async () => {
        const { visits, hasMore, loadingMore, loading } = get()
        if (!hasMore || loadingMore || loading) return

        const oldest = visits[visits.length - 1]
        if (!oldest) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        set({ loadingMore: true })

        // Use compound cursor: order by (scheduled_at DESC, id DESC)
        // and filter where scheduled_at < oldest.scheduled_at
        const { data, error } = await supabase
          .from('visits')
          .select('*, client:clients(*)')
          .eq('owner_user_id', user.id)
          .order('scheduled_at', { ascending: false })
          .order('id', { ascending: false })
          .or(`scheduled_at.lt.${oldest.scheduled_at},and(scheduled_at.eq.${oldest.scheduled_at},id.lt.${oldest.id})`)
          .limit(PAGE_SIZE)

        if (error) {
          set({ error: error.message, loadingMore: false })
          return
        }

        const rows = (data as unknown as VisitWithClient[]) ?? []
        set((state) => ({
          visits: [...state.visits, ...rows],
          hasMore: rows.length === PAGE_SIZE,
          loadingMore: false,
        }))
      },

      fetchVisitsByClient: async (clientId: string) => {
        const { data, error } = await supabase
          .from('visits')
          .select('*, client:clients(*)')
          .eq('client_id', clientId)
          .order('scheduled_at', { ascending: false })

        if (error || !data) return

        const incoming = data as VisitWithClient[]
        set((state) => {
          // Merge: replace any existing visits for this client, keep the rest
          const others = state.visits.filter((v) => v.client_id !== clientId)
          return { visits: [...others, ...incoming] }
        })
      },

      fetchVisitsByOwner: async (userId: string) => {
        set({ teamLoading: true })

        const { data, error } = await supabase
          .from('visits')
          .select('*, client:clients(*)')
          .eq('owner_user_id', userId)
          .order('scheduled_at', { ascending: false })

        if (error || !data) {
          set({ teamLoading: false })
          return
        }

        set({ teamVisits: data as VisitWithClient[], teamLoading: false })
      },

      clearTeamVisits: () => set({ teamVisits: [], teamLoading: false }),

      fetchVisit: async (id: string) => {
        const { data, error } = await supabase
          .from('visits')
          .select('*, client:clients(*)')
          .eq('id', id)
          .single()

        if (error || !data) return

        const visit = data as VisitWithClient
        set((state) => {
          const exists = state.visits.some((v) => v.id === id)
          return {
            visits: exists
              ? state.visits.map((v) => (v.id === id ? visit : v))
              : [visit, ...state.visits],
          }
        })
      },

      createVisit: async (data: CreateVisitInput) => {
        set({ error: null })

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          set({ error: 'Usuario no autenticado' })
          return null
        }

        const { data: created, error } = await supabase
          .from('visits')
          .insert({ ...data, owner_user_id: user.id, status: data.status ?? 'pending' })
          .select('*, client:clients(*)')
          .single()

        if (error) {
          set({ error: error.message })
          return null
        }

        const newVisit = created as VisitWithClient

        // Schedule notification for future visits only
        const isCreatedInTheFuture = dayjs(newVisit.scheduled_at).isAfter(dayjs())
        if (isCreatedInTheFuture && newVisit.client) {
          try {
            // Get gap preference from AsyncStorage
            const gapStr = await AsyncStorage.getItem(GAP_KEY)
            const gapMinutes = gapStr ? Number(gapStr) : DEFAULT_GAP

            // Schedule reminder and store notification ID if successful
            const notificationId = await scheduleVisitReminder(
              newVisit,
              newVisit.client.name,
              gapMinutes,
            )

            if (notificationId) {
              // Update visit record with notification_id
              const { error: updateError } = await supabase
                .from('visits')
                .update({ notification_id: notificationId })
                .eq('id', newVisit.id)

              if (updateError) {
                console.error('Failed to save notification_id:', updateError)
              } else {
                // Update local state with notification_id
                newVisit.notification_id = notificationId
              }
            }
          } catch (err) {
            // Log error but don't fail the visit creation
            console.error('Failed to schedule visit reminder:', err)
          }
        }

        set((state) => ({ visits: [newVisit, ...state.visits] }))
        return newVisit
      },

      updateVisit: async (id: string, data: UpdateVisitInput) => {
        set({ error: null })

        // Get the existing visit to check if scheduled_at changed
        const existingVisit = get().visits.find((v) => v.id === id)

        const { data: updated, error } = await supabase
          .from('visits')
          .update(data)
          .eq('id', id)
          .select('*, client:clients(*)')
          .single()

        if (error) {
          set({ error: error.message })
          return
        }

        const updatedVisit = updated as VisitWithClient

        // Handle notification rescheduling if scheduled_at changed
        if (existingVisit && data.scheduled_at && existingVisit.scheduled_at !== data.scheduled_at) {
          try {
            // Cancel old notification if it exists
            if (existingVisit.notification_id) {
              await cancelVisitReminder(existingVisit.notification_id)
            }

            // Schedule new notification for future visits
            const isScheduledInTheFuture = dayjs(updatedVisit.scheduled_at).isAfter(dayjs())
            if (isScheduledInTheFuture && updatedVisit.client) {
              const gapStr = await AsyncStorage.getItem(GAP_KEY)
              const gapMinutes = gapStr ? Number(gapStr) : DEFAULT_GAP

              const notificationId = await scheduleVisitReminder(
                updatedVisit,
                updatedVisit.client.name,
                gapMinutes,
              )

              if (notificationId) {
                // Update visit record with new notification_id
                const { error: updateError } = await supabase
                  .from('visits')
                  .update({ notification_id: notificationId })
                  .eq('id', id)

                if (updateError) {
                  console.error('Failed to save new notification_id:', updateError)
                } else {
                  updatedVisit.notification_id = notificationId
                }
              } else {
                // Notification couldn't be scheduled (e.g., time in past)
                const { error: clearError } = await supabase
                  .from('visits')
                  .update({ notification_id: null })
                  .eq('id', id)
                if (clearError) {
                  console.error('Failed to clear notification_id:', clearError)
                }
                updatedVisit.notification_id = null
              }
            } else {
              // Not scheduled in future, clear notification_id
              const { error: clearError } = await supabase
                .from('visits')
                .update({ notification_id: null })
                .eq('id', id)
              if (clearError) {
                console.error('Failed to clear notification_id:', clearError)
              }
              updatedVisit.notification_id = null
            }
          } catch (err) {
            // Log error but don't fail the visit update
            console.error('Failed to handle notification rescheduling:', err)
          }
        }

        set((state) => ({
          visits: state.visits.map((v) => (v.id === id ? updatedVisit : v)),
        }))
      },

      updateStatus: async (id: string, status: VisitStatus) => {
        set({ error: null })

        // Validate status against schema
        const validation = updateStatusSchema.safeParse({ status })
        if (!validation.success) {
          set({ error: 'Invalid status value' })
          return
        }

        // Get existing visit to check for notification
        const existingVisit = get().visits.find((v) => v.id === id)

        const { data: updated, error } = await supabase
          .from('visits')
          .update({ status })
          .eq('id', id)
          .select('*, client:clients(*)')
          .single()

        if (error) {
          set({ error: error.message })
          return
        }

        const updatedVisit = updated as VisitWithClient

        // Cancel notification if status is 'canceled'
        if (status === 'canceled' && existingVisit?.notification_id) {
          try {
            await cancelVisitReminder(existingVisit.notification_id)
          } catch (err) {
            console.error('Failed to cancel visit reminder:', err)
          }
        }

        set((state) => ({
          visits: state.visits.map((v) => (v.id === id ? updatedVisit : v)),
        }))
      },

      deleteVisit: async (id: string) => {
        set({ deleting: true, deleteError: null })

        // Get existing visit to retrieve notification_id
        const existingVisit = get().visits.find((v) => v.id === id)

        // Cancel notification before deleting
        if (existingVisit?.notification_id) {
          try {
            await cancelVisitReminder(existingVisit.notification_id)
          } catch (err) {
            console.error('Failed to cancel visit reminder:', err)
          }
        }

        const { error } = await supabase.from('visits').delete().eq('id', id)

        if (error) {
          set({ deleting: false, deleteError: error.message })
          return
        }

        set((state) => ({
          deleting: false,
          deleteError: null,
          visits: state.visits.filter((v) => v.id !== id),
        }))
      },

      deleteAllUserVisits: async () => {
        set({ error: null })

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          set({ error: 'Usuario no autenticado' })
          return
        }

        const { error } = await supabase
          .from('visits')
          .delete()
          .eq('owner_user_id', user.id)

        if (error) {
          set({ error: error.message })
          return
        }

        set({ visits: [] })
      },
    }),
    {
      name: 'visits-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ visits: state.visits, hasMore: state.hasMore }),
    }
  )
)
