import { Stack } from 'expo-router';
import { colors, fontSize, fontWeight } from '@/constants/theme';

export default function TeamLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Equipo' }} />
      <Stack.Screen name="branches" options={{ title: 'Sucursales' }} />
      <Stack.Screen name="branch-form" options={{ title: 'Sucursal' }} />
      <Stack.Screen name="users" options={{ title: 'Vendedores' }} />
      <Stack.Screen
        name="rejection-reasons"
        options={{ title: 'Motivos de rechazo' }}
      />
      <Stack.Screen
        name="payment-methods"
        options={{ title: 'Medios de pago' }}
      />
      <Stack.Screen name="financiers" options={{ title: 'Financieras' }} />
    </Stack>
  );
}
