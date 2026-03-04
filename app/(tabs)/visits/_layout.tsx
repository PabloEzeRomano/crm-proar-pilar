/**
 * app/(tabs)/visits/_layout.tsx — Visits stack layout
 *
 * Each tab maintains its own independent navigation stack so that
 * back-navigation stays within the tab context (per nav-spec §3).
 * Visual values come from constants/theme.ts.
 */

import { Stack } from 'expo-router'

import { colors, fontSize, fontWeight } from '@/constants/theme'

export default function VisitsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontSize: fontSize.lg,
          fontWeight: fontWeight.semibold as '600',
          color: colors.textPrimary,
        },
        headerBackButtonDisplayMode: 'minimal',
      }}
    />
  )
}
