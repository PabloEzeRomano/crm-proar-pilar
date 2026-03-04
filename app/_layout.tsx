/**
 * app/_layout.tsx — Root layout with authentication guard
 *
 * Responsibilities:
 *  1. Calls authStore.initialize() once on mount to restore any persisted session.
 *  2. Watches `session` and `loading`; redirects accordingly:
 *       - loading=true      → show full-screen loading indicator
 *       - no session + not in auth group → /(auth)/login
 *       - has session + in auth group   → /(tabs)/
 *  3. Renders a <Stack> with (auth) and (tabs), both headerShown: false.
 */

import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'

import { useAuthStore } from '@/stores/authStore'
import { colors } from '@/constants/theme'

// ---------------------------------------------------------------------------
// Auth guard hook
// ---------------------------------------------------------------------------

function useAuthGuard(): void {
  const session = useAuthStore((s) => s.session)
  const loading = useAuthStore((s) => s.loading)
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/')
    }
  }, [session, loading])
}

// ---------------------------------------------------------------------------
// Root layout component
// ---------------------------------------------------------------------------

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize)
  const loading = useAuthStore((s) => s.loading)

  // Initialize auth exactly once on mount.
  useEffect(() => {
    initialize()
  }, [])

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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
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
