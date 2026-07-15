import { Stack } from 'expo-router';
import { colors, fontSize } from '@/constants/theme';

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
};

export default function ProspectsLayout() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'Prospectos' }} />
      <Stack.Screen name="[id]" options={{ title: 'Prospecto' }} />
      <Stack.Screen
        name="form"
        options={{ presentation: 'modal', title: 'Nuevo prospecto' }}
      />
    </Stack>
  );
}
