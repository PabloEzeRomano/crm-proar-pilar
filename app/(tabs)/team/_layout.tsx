/**
 * app/(tabs)/team/_layout.tsx — Stack layout for the Equipo (Team) tab
 *
 * Screens:
 *   index     — User list (admin/root sees all company users)
 *   [userId]  — Per-user drill-down (visits + clients for that user)
 */

import { Stack } from 'expo-router'

import { colors, fontSize } from '@/constants/theme'

export default function TeamStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleAlign: 'center' as const,
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontSize: fontSize.lg,
          fontWeight: '600' as const,
          color: colors.textPrimary,
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Equipo' }} />
      <Stack.Screen name="[userId]" options={{ title: 'Actividad' }} />
    </Stack>
  )
}
