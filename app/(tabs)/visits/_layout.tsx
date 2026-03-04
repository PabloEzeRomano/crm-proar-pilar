/**
 * app/(tabs)/visits/_layout.tsx — Visits stack layout
 *
 * Story 5.3 — EP-005
 *
 * Registers three screens:
 *   - index  : visits list
 *   - [id]   : visit detail
 *   - form   : create / edit modal
 */

import { Stack } from 'expo-router'
import { colors, fontSize, fontWeight } from '@/constants/theme'

const headerOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTitleAlign: 'center' as const,
  headerShadowVisible: false,
  headerTintColor: colors.primary,
  headerTitleStyle: {
    fontSize: fontSize.lg,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  headerBackButtonDisplayMode: 'minimal' as const,
}

export default function VisitsLayout() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'Visitas' }} />
      <Stack.Screen name="[id]" options={{ title: 'Visita' }} />
      <Stack.Screen
        name="form"
        options={{ presentation: 'modal', title: 'Nueva visita' }}
      />
    </Stack>
  )
}
