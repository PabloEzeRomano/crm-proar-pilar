/**
 * app/_layout.tsx — Root layout with authentication guard
 *
 * Responsibilities:
 *  1. Calls authStore.initialize() once on mount to restore any persisted session.
 *  2. Watches `userId` and `loading`; redirects accordingly:
 *       - loading=true   → show full-screen loading indicator
 *       - no userId      → /(auth)/login
 *       - has userId     → /(tabs)/
 *  3. Renders a <Stack> with (auth) and (tabs), both headerShown: false.
 *
 * We derive the redirect from `session.user.id` (not the session object itself)
 * so that token refreshes — which swap the session but keep the same user —
 * do NOT trigger a spurious redirect away from deep tab screens.
 */

import { useEffect, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'

import { useAuthStore } from '@/stores/authStore'
import { useClientsStore } from '@/stores/clientsStore'
import { useVisitsStore } from '@/stores/visitsStore'
import { useTodayStore } from '@/stores/todayStore'
import { useLookupsStore } from '@/stores/lookupsStore'
import OnboardingTour from '@/components/OnboardingTour'
import { colors } from '@/constants/theme'

// ---------------------------------------------------------------------------
// Auth guard hook
// ---------------------------------------------------------------------------

function useRefreshLookupsOnFocus(): void {
  const refetchIfStale = useLookupsStore((s) => s.refetchIfStale)

  useFocusEffect(
    useCallback(() => {
      refetchIfStale()
    }, [refetchIfStale])
  )
}

function useAuthGuard(): void {
  const userId = useAuthStore((s) => s.session?.user?.id ?? null)
  const loading = useAuthStore((s) => s.loading)
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!userId) {
      router.replace('/(auth)/login')
    } else {
      router.replace('/(tabs)/')
    }
  }, [userId, loading])
}

// ---------------------------------------------------------------------------
// Root layout component
// ---------------------------------------------------------------------------

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize)
  const loading = useAuthStore((s) => s.loading)
  const userId = useAuthStore((s) => s.session?.user?.id ?? null)
  const showTour = useAuthStore((s) => s.profile?.show_tour ?? false)
  const fetchClients = useClientsStore((s) => s.fetchClients)
  const fetchVisits = useVisitsStore((s) => s.fetchVisits)
  const fetchTodayVisits = useTodayStore((s) => s.fetchTodayVisits)
  const fetchLookups = useLookupsStore((s) => s.fetchLookups)

  // Initialize auth exactly once on mount.
  useEffect(() => {
    initialize()
  }, [])

  // Bootstrap all data in parallel once we have an authenticated user.
  useEffect(() => {
    if (!userId) return
    Promise.all([fetchClients(), fetchVisits(), fetchTodayVisits(), fetchLookups()])
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Run the guard on every render that depends on session / loading.
  useAuthGuard()

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      {showTour && userId && <OnboardingTour />}
    </>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
})
