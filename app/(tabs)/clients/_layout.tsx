/**
 * app/(tabs)/clients/_layout.tsx — Clients stack layout
 *
 * Registers the three screens for the clients section:
 *   - index   : searchable clients list
 *   - [id]    : client detail view
 *   - form    : create / edit modal (presented modally)
 *
 * Visual values come from constants/theme.ts — no hardcoded tokens.
 */

import { Stack } from 'expo-router';

import { colors, fontSize, fontWeight } from '@/constants/theme';

const headerOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTitleAlign: 'center' as const,
  headerShadowVisible: false,
  headerTintColor: colors.primary,
  headerTitleStyle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  headerBackButtonDisplayMode: 'minimal' as const,
};

export default function ClientsLayout() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'Clientes' }} />
      <Stack.Screen name="[id]" options={{ title: 'Cliente' }} />
      <Stack.Screen
        name="form"
        options={{ presentation: 'modal', title: 'Nuevo cliente' }}
      />
    </Stack>
  );
}
