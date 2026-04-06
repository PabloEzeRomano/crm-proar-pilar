/**
 * app/(tabs)/agenda/_layout.tsx — Agenda stack layout
 *
 * EP-022: Gives the Agenda tab its own nested Stack so that tapping a visit
 * from the Today screen pushes the detail within the Agenda stack. The native
 * back button returns to the Agenda automatically — no query-param workaround.
 *
 * The parent Tabs.Screen for "agenda" must set headerShown: false so only this
 * Stack's header is rendered (avoids a duplicate title bar).
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

export default function AgendaLayout() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'Agenda' }} />
      <Stack.Screen name="visits/[id]" options={{ title: 'Visita' }} />
      <Stack.Screen name="visits/form" options={{ presentation: 'modal', title: 'Editar visita' }} />
    </Stack>
  )
}
