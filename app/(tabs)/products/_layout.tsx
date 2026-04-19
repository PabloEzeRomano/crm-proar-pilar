import { Stack } from 'expo-router'

import { colors, fontSize } from '@/constants/theme'

export default function ProductsStackLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Productos' }} />
      <Stack.Screen name="new" options={{ title: 'Nuevo producto' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle de producto' }} />
    </Stack>
  )
}
