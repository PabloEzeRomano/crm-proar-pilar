import { Stack } from 'expo-router';
import { colors, fontSize, fontWeight } from '@/constants/theme';

export default function CampaignsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: {
          fontSize: fontSize.lg,
          fontWeight: fontWeight.semibold,
          color: colors.textPrimary,
        },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Campañas' }} />
      <Stack.Screen name="new" options={{ title: 'Nueva campaña' }} />
      <Stack.Screen name="[id]" options={{ title: 'Campaña' }} />
      <Stack.Screen name="offer-form" options={{ title: 'Oferta' }} />
      <Stack.Screen name="assign" options={{ title: 'Asignar clientes' }} />
    </Stack>
  );
}
