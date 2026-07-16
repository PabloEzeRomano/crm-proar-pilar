import { Stack } from 'expo-router';
import { colors, fontSize, fontWeight } from '@/constants/theme';

export default function BuscadorLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontSize: fontSize.lg,
          fontWeight: fontWeight.semibold,
          color: colors.textPrimary,
        },
        headerBackTitle: '',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Buscador de Leads' }} />
      <Stack.Screen name="new" options={{ title: 'Nueva búsqueda' }} />
      <Stack.Screen name="[searchId]" options={{ title: 'Resultados' }} />
    </Stack>
  );
}
