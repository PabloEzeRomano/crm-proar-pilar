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

import { useCallback, useEffect } from 'react'
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import * as Notifications from 'expo-notifications'

import { colors } from '@/constants/theme'
import OnboardingTour from '@/components/OnboardingTour'
import { useAuthStore } from '@/stores/authStore'
import { useClientsStore } from '@/stores/clientsStore'
import { useLookupsStore } from '@/stores/lookupsStore'
import { useTodayStore } from '@/stores/todayStore'
import { useVisitsStore } from '@/stores/visitsStore'

// ---------------------------------------------------------------------------
// Notification setup (Android channel configuration)
// ---------------------------------------------------------------------------

if (Platform.OS !== 'web') {
  Notifications.setNotificationChannelAsync('visits', {
    name: 'Visitas',
    importance: Notifications.AndroidImportance.HIGH,
    bypassDnd: true, // Show heads-up notification even if DND is on
    vibrationPattern: [0, 250, 250, 250],
    lightColor: colors.primary,
  }).catch(() => {
    // Channel may already exist, ignore error
  })

  // Set default notification handler for foreground notifications
  const notificationBehavior: Notifications.NotificationBehavior = {
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }
  Notifications.setNotificationHandler({
    handleNotification: async () => notificationBehavior,
  })
}

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
// Notification permission request hook
// ---------------------------------------------------------------------------

function useNotificationPermission(): void {
  const loading = useAuthStore((s) => s.loading)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    // Only request permission after auth is complete
    if (loading || !user) {
      return
    }

    // Skip on web and check if API is available (not in Expo Go on Android)
    if (Platform.OS === 'web' || !Notifications.requestPermissionsAsync) {
      return
    }

    const requestPermission = async () => {
      try {
        const result = await Notifications.requestPermissionsAsync({
          ios: { provideAppNotificationSettings: true },
        })
        console.log('Notification permission result:', result)
      } catch (error) {
        console.warn('Notification permission unavailable (might be Expo Go):', error)
      }
    }

    requestPermission()
  }, [loading, user])
}

// ---------------------------------------------------------------------------
// Notification response listener hook
// ---------------------------------------------------------------------------

function useNotificationResponseListener(): void {
  const router = useRouter()

  useEffect(() => {
    // Skip on web and if API is unavailable (not in Expo Go on Android)
    if (Platform.OS === 'web' || !Notifications.addNotificationResponseReceivedListener) {
      return
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        // Extract visit ID from notification data if available
        const visitId = response.notification.request.content.data?.visitId as string | undefined

        if (visitId) {
          // Navigate directly to the visit detail if visitId is available
          router.push(`/(tabs)/visits/${visitId}`)
        } else {
          // Fallback: navigate to visits list and let user select
          router.push('/(tabs)/visits')
        }
      } catch (error) {
        console.error('Failed to handle notification response:', error)
      }
    })

    return () => {
      // Cleanup: remove the subscription
      subscription.remove()
    }
  }, [router])
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

  // Refresh lookups when app comes into focus
  useRefreshLookupsOnFocus()

  // Run the guard on every render that depends on session / loading.
  useAuthGuard()

  // Request notification permission after auth is complete
  useNotificationPermission()

  // Set up notification response listener (navigate on tap)
  useNotificationResponseListener()

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
