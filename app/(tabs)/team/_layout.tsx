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
    </Stack>
  )
}
